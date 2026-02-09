from __future__ import annotations

from datetime import date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account_code import AccountCode
from app.models.project import Project
from app.models.transaction import TransactionHead, TransactionLine


class ReportingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def financial_statements(self, start: date, end: date) -> dict:
        # Balance sheet by project type
        bs_stmt = (
            select(
                Project.type.label("project_type"),
                AccountCode.level1,
                AccountCode.level2,
                AccountCode.level3,
                func.sum(TransactionLine.debit_amount - TransactionLine.credit_amount).label("amount"),
            )
            .select_from(TransactionLine)
            .join(TransactionHead, TransactionHead.id == TransactionLine.head_id)
            .join(Project, Project.id == TransactionLine.project_id)
            .join(AccountCode, AccountCode.id == TransactionLine.account_code_id)
            .where(TransactionHead.status == "APPROVED")
            .where(TransactionHead.tx_date.between(start, end))
            .where(AccountCode.level1.in_(["자산", "부채", "순자산"]))
            .group_by(Project.type, AccountCode.level1, AccountCode.level2, AccountCode.level3)
        )

        # Operating statement by project type
        os_stmt = (
            select(
                Project.type.label("project_type"),
                AccountCode.level1,
                AccountCode.level2,
                func.sum(TransactionLine.credit_amount - TransactionLine.debit_amount).label("amount"),
            )
            .select_from(TransactionLine)
            .join(TransactionHead, TransactionHead.id == TransactionLine.head_id)
            .join(Project, Project.id == TransactionLine.project_id)
            .join(AccountCode, AccountCode.id == TransactionLine.account_code_id)
            .where(TransactionHead.status == "APPROVED")
            .where(TransactionHead.tx_date.between(start, end))
            .where(AccountCode.level1.in_(["수익", "비용"]))
            .group_by(Project.type, AccountCode.level1, AccountCode.level2)
        )

        bs_rows = (await self.db.execute(bs_stmt)).all()
        os_rows = (await self.db.execute(os_stmt)).all()

        balance_sheet = {}
        for project_type, l1, l2, l3, amount in bs_rows:
            balance_sheet.setdefault(project_type, []).append(
                {"level1": l1, "level2": l2, "level3": l3, "amount": float(amount or 0)}
            )

        operating_statement = {}
        for project_type, l1, l2, amount in os_rows:
            operating_statement.setdefault(project_type, []).append(
                {"level1": l1, "level2": l2, "amount": float(amount or 0)}
            )

        return {
            "balance_sheet": balance_sheet,
            "operating_statement": operating_statement,
        }

    async def reserve_simulation(
        self,
        start: date,
        end: date,
        limit_rate: float,
        penalty_rate: float,
        unused_amount: float,
    ) -> dict:
        # Profit = sum(revenue - expense) for Profit projects
        stmt = (
            select(
                func.sum(TransactionLine.credit_amount - TransactionLine.debit_amount).label("amount")
            )
            .select_from(TransactionLine)
            .join(TransactionHead, TransactionHead.id == TransactionLine.head_id)
            .join(Project, Project.id == TransactionLine.project_id)
            .join(AccountCode, AccountCode.id == TransactionLine.account_code_id)
            .where(TransactionHead.status == "APPROVED")
            .where(TransactionHead.tx_date.between(start, end))
            .where(Project.type == "Profit")
            .where(AccountCode.level1.in_(["수익", "비용"]))
        )
        amount = (await self.db.execute(stmt)).scalar() or 0
        profit = Decimal(str(amount))

        max_reserve = profit * Decimal(str(limit_rate))
        penalty = Decimal(str(unused_amount)) * Decimal(str(penalty_rate))

        return {
            "profit": float(profit),
            "limit_rate": limit_rate,
            "max_reserve": float(max_reserve),
            "unused_amount": float(unused_amount),
            "penalty_rate": penalty_rate,
            "expected_penalty": float(penalty),
        }

    async def public_spending_compliance(
        self,
        prev_year_revenue: float,
        current_public_spend: float,
    ) -> dict:
        required = Decimal(str(prev_year_revenue)) * Decimal("0.8")
        actual = Decimal(str(current_public_spend))
        return {
            "required_amount": float(required),
            "actual_amount": float(actual),
            "status": "PASS" if actual >= required else "FAIL",
        }
