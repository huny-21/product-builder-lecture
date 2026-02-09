from pydantic import BaseModel


class ComplianceIssue(BaseModel):
    level: str
    message: str


class BoardComplianceStatus(BaseModel):
    director_count: int
    auditor_count: int
    special_relation_count: int
    foreign_director_count: int
    issues: list[ComplianceIssue]
