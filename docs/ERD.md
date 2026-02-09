# ERD (Draft)

## Entities
- Project (Public/Profit)
- Budget
- Account_Code (관-항-목)
- Transaction_Head
- Transaction_Line
- Allocation_Rule
- Allocation_Rule_Item
- Allocation_Result
- Donor
- Donor_Sensitive
- Donation
- Donation_Receipt
- Audit_Log
- Approval_Step
- Transaction_Approval

## Relationships
- Project 1..* Budget
- Project 1..* Transaction_Line
- Account_Code 1..* Transaction_Line
- Transaction_Head 1..* Transaction_Line
- Allocation_Rule 1..* Allocation_Rule_Item
- Allocation_Rule_Item *..1 Project
- Allocation_Result *..1 Transaction_Line (source + allocated)
- Donor 1..1 Donor_Sensitive
- Donor 1..* Donation
- Donation 0..* Donation_Receipt
- Transaction_Head 1..* Transaction_Approval
- Approval_Step 1..* Transaction_Approval
- Any table -> Audit_Log (via triggers)

## Notes
- Transaction_Line must always reference Project.
- Debit/Credit balance enforced by trigger.
- Donor sensitive fields isolated and encrypted.
