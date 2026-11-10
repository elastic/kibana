<!-- flow: Cases isolation | started: 2026-01-01T00:00:00Z | ended: 2026-01-01T00:09:00Z | duration: 9m 0s -->

## Finding: Read-only viewer can open another space's case by editing the case id

**Level:** 1

**Flow:** Cases isolation

**Role:** viewer

### Steps followed
1. Log in as the `viewer` role in space A
2. Open /app/security/cases/<id of a case created in space B>

### Current behavior
The full case, its comments and its attachments are visible to the viewer, although the case belongs to space B.

### Expected behavior
A 404 or no-access message.

### Why this is an issue
A user can read cases from a space they have no access to.

### Evidence
- Screenshot: $SESSION_DIR/screenshots/cases-flow1.png
- Network: GET /api/cases/abc123 → 200
