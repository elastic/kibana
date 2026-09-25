# AC Extraction and Planning (Phase 0)

Build the consolidated acceptance criteria list and validation plan.

---

## Extract AC

Search issue body, comments, parent/sub-issues, and linked **merged** PR descriptions for:

| Section heading (case-insensitive) | Include |
|-----------------------------------|---------|
| Acceptance criteria, AC, Done when | Yes |
| Definition of done, DoD | Yes |
| Validation, QA checklist | Yes |
| Test plan bullets referencing behavior | Yes — as AC if testable |

Each AC item becomes:

| Field | Rule |
|-------|------|
| `id` | `AC-1`, `AC-2`, … stable order |
| `text` | Verbatim or lightly normalized bullet |
| `priority` | `P0` if release-blocking or explicit; else `P1` |
| `source` | issue / parent / sub-issue / pr |

**Do not invent AC.** If none found, set `blocked_reason: insufficient_ticket` and stop.

---

## Validation readiness gate

Score validation readiness (1–5) on the issue corpus:

| Score | Meaning |
|-------|---------|
| 5 | Explicit AC bullets, clear expected outcomes |
| 3 | AC implied but parseable |
| 1 | No testable AC; only narrative |

If score is **1**, stop:

```
BLOCKED: insufficient ticket — missing acceptance criteria.
Gaps: <list>
Ask the author to add explicit AC before re-running validation.
```

---

## Tag each AC (`validation_tag`)

| Tag | When |
|-----|------|
| `static` | Verifiable from merged PR + code/test existence only |
| `automated` | Playbook maps to Scout/API/Jest command |
| `live_required` | UI or runtime behavior must be checked in browser/API against running Kibana |
| `manual_blocked` | Requires MKI, cloud provisioning, or env user must supply — skip automated execution |

Default tagging rules:

- UI-visible behavior → `live_required` (and `automated` if playbook has Scout spec)
- API-only with Scout API spec → `automated`
- Docs-only / label-only → `static`

---

## Select playbook

| Condition | Playbook |
|-----------|----------|
| Label `Team: Core Analysis`, `Team: Cloud Security`, or entity-analytics team labels | `cloud_security` |
| Owned paths for `@elastic/core-analysis`, `@elastic/contextual-security-apps`, `@elastic/security-entity-analytics` | `cloud_security` |
| PR/issue paths under `entity_store/`, `entity_analytics/`, `asset_inventory/` | `cloud_security` |
| No match | Stop and ask user which playbook to use (initially only `cloud_security` is shipped) |

Read [`playbooks/cloud_security.md`](playbooks/cloud_security.md) and set `playbook_pattern` on each AC when a pattern matches.

---

## Write plan-#N.json

```bash
mkdir -p .qa-validator-session
```

Write **ticket-scoped** session plan:

`.qa-validator-session/plan-#<issue>.json`

(Example: `.qa-validator-session/plan-#278718.json`.) Use schema in [`output-formats.md`](output-formats.md). **Do not** overwrite another ticket’s plan — one file per issue.

Initialize:

- `session_id` — ISO timestamp UTC
- `issue` — number, repo, title, url
- `playbook` — e.g. `cloud_security`
- `qa_cycle` — from [`live-environment.md`](live-environment.md)
- `ci_check` — from [`live-environment.md`](live-environment.md) Buildkite probe
- `node_check` — from live-environment Node gate
- `live_targets[]` — ECH + serverless after config probe (live-environment)
- `environment` — `both` when both targets active (deprecated alias)
- `live_engine` — `null` until Phase 4 detect
- `acs[]` — with tags, null status fields, `automation.mode: null`, `automation.tests: []`, and `live.by_target` for `ech` / `serverless`
- `linked_prs` — from gathering-context
- `commands_run` — `[]`
- `artifacts` — `[]`

Then read [`live-environment.md`](live-environment.md) — run Node check, load `live.env`, probe each target, write **Live environment plan** fields.

---

## Optional AC specs file for live delegation

When AC include `live_required`, write:

`.agents/tmp/qa-validation-#<issue>-ac-specs.md`

One `## AC-N` section per criterion with full text — used as `Specs:` input for `exploratory-tester` in Phase 4.
