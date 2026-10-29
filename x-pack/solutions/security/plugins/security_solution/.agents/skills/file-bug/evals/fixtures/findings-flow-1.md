<!-- flow: Happy path | started: 2026-01-01T00:00:00Z | ended: 2026-01-01T00:12:00Z | duration: 12m 0s -->

## Finding: Risk scores table stays empty after 1 year range

**Level:** 1

**Flow:** Happy path

**Role:** t2_analyst

### Steps followed
1. Open Entity Analytics
2. Set the time range to Last 1 year

### Current behavior
Table shows 0 entities and a "TypeError: cannot read map of undefined" toast.

### Expected behavior
Table lists the entities in range.

### Why this is an issue
Analysts cannot see yearly risk.

### Evidence
- Screenshot: $SESSION_DIR/screenshots/ea-flow1.png
- Console: TypeError: cannot read map of undefined
- Network: GET /internal/risk_score → 500
