# NPO-TrustOS Architecture (Draft)

## Goals
- Scalability: modular domain services, stateless API, horizontal scaling.
- Security: PII protection, strict access control, auditability.
- Integrity: double-entry accounting, immutable audit logs, approval workflow.
- Compliance: K-GAAP for NPOs (public vs profit segregation).

## System Context
- Frontend: React (TypeScript) + Vite
- Backend: FastAPI (Python)
- DB: PostgreSQL
- Cloud: Managed DB + object storage (evidence files)

## Core Domains
- Accounting: Journal (Transaction Head/Line), Account Codes, Approval workflow
- Projects: Public/Profit segregation, budgeting
- Donations: Donor, Donation, Receipt issuance
- Allocation: Common cost allocation rules
- Audit: Immutable change logs

## Service Modules (Backend)
- api: routing layer
- core: config, security, logging
- domain: models (SQLAlchemy), services, validation
- infra: db/session, repositories
- workflow: approval state machine
- reporting: read-optimized queries/views

## Data Flow (Simplified)
- UI -> API -> Service -> Repository -> DB
- Evidence files stored in object storage, referenced by URL in DB
- Reporting uses DB views/functions for consistency

## Integrity Rules
- Transaction lines must be linked to Project.
- Debit sum == Credit sum (trigger enforced).
- Approval required before reporting inclusion.

