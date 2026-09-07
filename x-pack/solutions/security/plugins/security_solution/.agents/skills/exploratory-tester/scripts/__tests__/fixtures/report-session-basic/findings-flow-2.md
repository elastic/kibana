<!-- flow: Anomalies tab — filters and controls | started: 2026-07-06T09:20:00Z | ended: 2026-07-06T09:23:00Z | duration: 3m 0s -->

## Finding: Duplicate privilege-check API calls on single flyout open

**Level:** 2
**Flow:** Anomalies tab — filters and controls
**Role:** exploratory_platform_engineer
**Checklist step:** 1 — Happy path

### Steps followed
1. Opened the entity flyout again while starting this flow.
2. Captured network requests.

### Current behavior
Independently reproduced while starting this flow: the same privileges endpoint is called multiple times for a single flyout open.

### Expected behavior
A single flyout open should not re-check the same privileges multiple times.

### Why this might be an issue
Same redundant-call issue as observed in the previous flow.

### Evidence
- Network: `GET internal/security/entity_store/check_privileges` → 200 (×3, seen again in flow 2 trace)
- Video: `$SESSION_DIR/videos/findings-flow-2.mp4`

---
