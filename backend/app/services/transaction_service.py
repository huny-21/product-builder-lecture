from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BudgetExceededException
from app.models.account_code import AccountCode
from app.models.allocation import AllocationRule, AllocationRuleItem
from app.models.budget import Budget
from app.models.transaction import TransactionHead, TransactionLine


@dataclass
class TransactionLineInput:
    project_id: str
    account_code_id: str
    debit_amount: Decimal
    credit_amount: Decimal
    evidence_url: str | None = None


class TransactionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_transaction(
        self,
        head: TransactionHead,
        lines: Iterable[TransactionLineInput],
        user_role: str,
        force_on_budget_exceed: bool = False,
    ) -> TransactionHead:
        # 1) Persist head
        self.db.add(head)
        await self.db.flush()

        # 2) Expand lines with auto-allocation
        expanded_lines: list[TransactionLine] = []
        for line in lines:
            account_code = await self._get_account_code(line.account_code_id)
            if account_code.is_common_expense:
                allocated = await self._allocate_common_expense(
                    head.tx_date, line, account_code
                )
                expanded_lines.extend(allocated)
            else:
                expanded_lines.append(self._to_line(head.id, line))

        # 3) Budget control before insert
        await self._check_budget(expanded_lines, user_role, force_on_budget_exceed)

        # 4) Persist lines
        for line in expanded_lines:
            self.db.add(line)
        await self.db.flush()

        # 5) Update budgets (spent)
        await self._apply_budget_spent(expanded_lines)

        return head

    async def _get_account_code(self, account_code_id: str) -> AccountCode:
        result = await self.db.execute(
            select(AccountCode).where(AccountCode.id == account_code_id)
        )
        account_code = result.scalar_one()
        return account_code

    async def _allocate_common_expense(
        self,
        tx_date: date,
        line: TransactionLineInput,
        account_code: AccountCode,
    ) -> list[TransactionLine]:
        # Find active rule (by effective date)
        rule = await self._find_allocation_rule(line.project_id, tx_date)
        if not rule:
            # If no rule, fallback to original line
            return [self._to_line(None, line)]

        items = await self._get_allocation_items(rule.id)
        if not items:
            return [self._to_line(None, line)]

        amount = line.debit_amount or line.credit_amount
        is_debit = line.debit_amount > 0
        allocated_lines: list[TransactionLine] = []
        allocated_sum = Decimal("0.00")

        for item in items:
            ratio = Decimal(str(item.ratio))
            part = (amount * ratio).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            allocated_sum += part
            allocated_lines.append(
                TransactionLine(
                    head_id=None,
                    project_id=item.target_project_id,
                    account_code_id=account_code.id,
                    debit_amount=part if is_debit else Decimal("0.00"),
                    credit_amount=part if not is_debit else Decimal("0.00"),
                    evidence_url=line.evidence_url,
                )
            )

        # Rounding adjustment: add remainder to last line
        remainder = amount - allocated_sum
        if allocated_lines and remainder != 0:
            last = allocated_lines[-1]
            if is_debit:
                last.debit_amount += remainder
            else:
                last.credit_amount += remainder

        return allocated_lines

    async def _find_allocation_rule(self, project_id: str, tx_date: date) -> AllocationRule | None:
        result = await self.db.execute(
            select(AllocationRule)
            .where(AllocationRule.project_id == project_id)
            .where(AllocationRule.effective_from <= tx_date)
            .where((AllocationRule.effective_to.is_(None)) | (AllocationRule.effective_to >= tx_date))
            .order_by(AllocationRule.effective_from.desc())
        )
        return result.scalar_one_or_none()

    async def _get_allocation_items(self, rule_id: str) -> list[AllocationRuleItem]:
        result = await self.db.execute(
            select(AllocationRuleItem).where(AllocationRuleItem.rule_id == rule_id)
        )
        return list(result.scalars().all())

    def _to_line(self, head_id: str | None, line: TransactionLineInput) -> TransactionLine:
        return TransactionLine(
            head_id=head_id,
            project_id=line.project_id,
            account_code_id=line.account_code_id,
            debit_amount=line.debit_amount,
            credit_amount=line.credit_amount,
            evidence_url=line.evidence_url,
        )

    async def _check_budget(
        self,
        lines: list[TransactionLine],
        user_role: str,
        force_on_budget_exceed: bool,
    ) -> None:
        for line in lines:
            amount = line.debit_amount
            if amount <= 0:
                continue
            fiscal_year = date.today().year
            result = await self.db.execute(
                select(Budget).where(
                    (Budget.project_id == line.project_id)
                    & (Budget.fiscal_year == fiscal_year)
                )
            )
            budget = result.scalar_one_or_none()
            if not budget:
                continue
            remaining = Decimal(str(budget.total_budget)) - Decimal(str(budget.total_spent))
            if remaining < Decimal(str(amount)):
                if user_role.lower() == "admin" and force_on_budget_exceed:
                    continue
                raise BudgetExceededException(str(line.project_id), float(remaining), float(amount))

    async def _apply_budget_spent(self, lines: list[TransactionLine]) -> None:
        for line in lines:
            amount = line.debit_amount
            if amount <= 0:
                continue
            fiscal_year = date.today().year
            result = await self.db.execute(
                select(Budget).where(
                    (Budget.project_id == line.project_id)
                    & (Budget.fiscal_year == fiscal_year)
                )
            )
            budget = result.scalar_one_or_none()
            if not budget:
                continue
            budget.total_spent = Decimal(str(budget.total_spent)) + Decimal(str(amount))
            self.db.add(budget)
