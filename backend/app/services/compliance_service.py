from __future__ import annotations

from dataclasses import dataclass
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.board_member import BoardMember


DIRECTOR_ROLES = {"이사", "대표이사", "director", "ceo"}
AUDITOR_ROLES = {"감사", "auditor"}


@dataclass
class ComplianceIssue:
    level: str
    message: str


class ComplianceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_board(self) -> tuple[dict[str, int], list[ComplianceIssue]]:
        director_count = await self._count_by_roles(DIRECTOR_ROLES)
        auditor_count = await self._count_by_roles(AUDITOR_ROLES)
        foreign_directors = await self._count_foreign_directors()
        special_relation_directors = await self._count_special_relation_directors()

        issues: list[ComplianceIssue] = []

        if director_count < 5:
            issues.append(ComplianceIssue(level="ERROR", message="이사 정수가 최소 5명 미만입니다."))
        if director_count > 15:
            issues.append(ComplianceIssue(level="ERROR", message="이사 정수가 최대 15명을 초과합니다."))
        if auditor_count < 2:
            issues.append(ComplianceIssue(level="ERROR", message="감사 정수가 최소 2명 미만입니다."))

        if director_count > 0:
            if special_relation_directors / director_count > 0.2:
                issues.append(ComplianceIssue(level="WARNING", message="특수관계인 이사가 전체 이사의 1/5을 초과합니다."))
            if foreign_directors / director_count > 0.5:
                issues.append(ComplianceIssue(level="ERROR", message="외국인 이사가 전체 이사의 1/2을 초과합니다."))

        stats = {
            "director_count": director_count,
            "auditor_count": auditor_count,
            "special_relation_count": special_relation_directors,
            "foreign_director_count": foreign_directors,
        }
        return stats, issues

    async def _count_by_roles(self, roles: set[str]) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(BoardMember).where(BoardMember.role.in_(roles))
        )
        return int(result.scalar_one())

    async def _count_foreign_directors(self) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(BoardMember)
            .where(BoardMember.role.in_(DIRECTOR_ROLES))
            .where(BoardMember.is_foreigner.is_(True))
        )
        return int(result.scalar_one())

    async def _count_special_relation_directors(self) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(BoardMember)
            .where(BoardMember.role.in_(DIRECTOR_ROLES))
            .where(BoardMember.special_relation_to_id.is_not(None))
        )
        return int(result.scalar_one())
