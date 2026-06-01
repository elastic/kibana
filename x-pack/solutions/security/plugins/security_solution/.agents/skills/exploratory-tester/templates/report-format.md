# Report Format

Write `.exploratory-session/report.md` using this template:

```markdown
# Exploratory Testing Report

**Area:** <area>
**Environment:** <environment.type> at <environment.url>
**Space:** <space_id>
**Role:** <resolved_role>
**User:** <test_user.username>
**Date:** <today's date>
**Mode:** <single | parallel>
**Flows explored:** <N>
**Session started:** <session_started_at from config.json>
**Session duration:** <total elapsed from session_started_at to now>

## Summary
- Level 1 (confirmed bugs): N
- Level 2 (suspicious — your review needed): N
- Level 3 (observations): N
- Known / suppressed: N
- **Flows completed:** N of N
- **Flows not fully completed:** N — list each with its status

## Timing
| Flow | Source | Started | Duration | Budget | Over? | Status |
|---|---|---|---|---|---|---|
| <flow name> | specified / agent | <ISO start> | <Xm Ys> | <timeout_minutes>m | ✓ / ⚠️ over | completed / timed out / blocked / not started / session lost |
| **Total session** | — | <session_started_at> | **<Xh Ym>** | — | — | — |

**Status definitions:**
- `completed` — all 5 checklist steps were attempted
- `timed out` — time budget exhausted; list which steps were skipped
- `blocked` — unresolvable prerequisite; state the blocker
- `not started` — flow never reached
- `session lost` — browser session lost mid-flow

## Level 1 — Confirmed Bugs
<all Level 1 findings in full finding format>

## Level 2 — Suspicious
<all Level 2 findings in full finding format>

## Level 3 — Observations
<all Level 3 findings in short observation format>

## Skipped
| Flow | Checklist step | Reason |
|---|---|---|
| <flow name> | <step> | time budget exhausted / session lost |

## Known / Suppressed
| Finding | Reason suppressed |
|---|---|
| <title> | Matches knowledge/<area_slug>.md: "<entry>" |
| <title> | Matches known open bug #<number>: "<title>" |
```
