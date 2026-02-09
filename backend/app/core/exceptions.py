class BudgetExceededException(Exception):
    def __init__(self, project_id: str, remaining: float, amount: float):
        super().__init__(
            f"Budget exceeded for project {project_id}. Remaining={remaining}, Amount={amount}"
        )
        self.project_id = project_id
        self.remaining = remaining
        self.amount = amount
