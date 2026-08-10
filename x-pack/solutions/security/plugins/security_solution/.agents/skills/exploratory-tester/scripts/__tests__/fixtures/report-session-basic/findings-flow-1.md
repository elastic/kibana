<!-- flow: Overview panel — Behavioral anomalies accordion | started: 2026-07-06T09:05:00Z | ended: 2026-07-06T09:17:38Z | duration: 12m 38s -->

## Finding: anomaly_overview and anomaly_summary leak ML anomaly data across Kibana spaces

**Level:** 1
**Flow:** Overview panel — Behavioral anomalies accordion
**Role:** exploratory_platform_engineer
**Checklist step:** 3 — Invalid/edge-case input

### Steps followed
1. Created a fresh, completely unconfigured space.
2. Called anomaly_overview/anomaly_summary from this empty space for the same entity ID.

### Current behavior
Both endpoints, called from the completely unconfigured space, return the exact same anomaly record that legitimately belongs to the primary space.

### Expected behavior
A space with no entity store/ML setup should return zero anomalies for any entity.

### Why this might be an issue
This is a genuine multi-tenancy/data-isolation violation.

### Evidence
- Network: `POST /s/exploratory-testing-2/internal/entity_analytics/anomalies/anomaly_overview` → 200, same recordId as exploratory-testing space
- Screenshot: `$SESSION_DIR/screenshots/entity-analytics-flow1-leak.png`

---

## Finding: Duplicate privilege-check API calls on single flyout open

**Level:** 2
**Flow:** Overview panel — Behavioral anomalies accordion
**Role:** exploratory_platform_engineer
**Checklist step:** 1 — Happy path

### Steps followed
1. Opened the entity flyout for a test user.
2. Captured network requests via browser_network_requests.

### Current behavior
For one flyout-open action, `GET internal/security/entity_store/check_privileges` was called 3 times instead of once.

### Expected behavior
A single flyout open should not re-check the same privileges multiple times.

### Why this might be an issue
Redundant privilege checks add latency and unnecessary load.

### Evidence
- Network: `GET internal/security/entity_store/check_privileges` → 200 (×3, lines 374/468/474 in request log)
- Screenshot: `$SESSION_DIR/screenshots/entity-analytics-flow1-dup-calls.png`

---

## Observation: Happy path — Behavioral anomalies accordion renders correctly

**Level:** 3
**Flow:** Overview panel — Behavioral anomalies accordion
**Role:** exploratory_platform_engineer
**Checklist step:** 1 — Happy path

### Current behavior
The Behavioral anomalies accordion is expanded by default and shows the correct total anomaly count.

### Evidence
- Screenshot: `$SESSION_DIR/screenshots/entity-analytics-flow1-happy-path.png`
