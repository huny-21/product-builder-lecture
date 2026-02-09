# Security & Compliance (Draft)

## PII Protection
- Sensitive data separated into dedicated tables (e.g., donor_sensitive).
- Encryption at rest via KMS-managed keys.
- Field-level encryption (AES-256-GCM at app layer).

## Access Control
- Role-based access (RBAC) baseline.
- Future: ABAC for project-level segregation.
- Principle of least privilege.

## Auditability
- Immutable audit logs with before/after JSON payload.
- Append-only storage policy for audit logs.
- Separate retention policy for audit logs.

## Data Integrity
- Double-entry accounting enforced by DB trigger.
- Approval workflow gating on reporting queries.
- Allocation rule validation (ratio sum = 1.0).

## Storage
- Evidence files stored in object storage, signed URLs for access.
- DB stores references only (evidence_url).

