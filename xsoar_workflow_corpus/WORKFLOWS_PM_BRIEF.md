# XSOAR → Elastic Workflows: conversion gap brief

**Audience:** Workflows PM  
**Snapshot:** 27 August 2026 ingest of non-deprecated XSOAR playbooks  
**How to regenerate:** [README](./README.md) (inventory → ingest → dashboard)

Local dashboard after ingest: [XSOAR Workflow Gap Analysis](http://localhost:5601/app/dashboards#/view/xsoar-workflow-gap-analysis)

## Thesis

Converted YAML that *parses* is not conversion-ready. A **blocker** is an unsupported step on the default success path that is not optional. On this snapshot, **87% of playbooks** cannot complete that happy path without a missing capability.

| | Inventory files | Elasticsearch (dashboard) |
| --- | ---: | ---: |
| Playbooks | 1,375 | 1,355 |
| Blocked playbooks | 1,191 (87%) | 1,173 (87%) |
| Gap events | 6,024 | 6,024 |
| Blocker gaps | 4,442 | 4,442 |
| Non-blocker gaps | 1,582 | 1,582 |

Elasticsearch playbook counts are slightly lower because ingest uses `_id = pack:playbook_id` and duplicate IDs collapse. Ratios match.

## Glossary

These words appear on the dashboard, in Discover, and in `corpus/analysis/*.csv`. They are not interchangeable.

| Term | Meaning |
| --- | --- |
| **Playbook** | One XSOAR playbook YAML. The dashboard **Playbooks** metric is a document count. |
| **Unique playbooks** | Distinct playbook IDs when grouping *tasks* (gaps, brands, approvals). “PAN-OS in 70 playbooks” means 70 playbooks, not 70 tasks. |
| **Pack** | An XSOAR content pack folder (PrismaCloud, PAN-OS, Phishing, …). |
| **Unique packs** | Distinct pack folders that contain those playbooks or tasks. |
| **Task / step** | One node in a playbook graph. Most gap charts count tasks, not playbooks. |
| **Gap** | A task the converter cannot map to a real Kibana workflow step (emitted as a `console` stub). YAML still parses. |
| **Happy path** | The default success chain from the start task (`#none#`), not failure/timeout branches. |
| **Optional** | XSOAR `skipunavailable` or `isOptional` (typical vendor fan-out: try this integration if installed). |
| **`is_critical` (true)** | On the happy path **and** not optional. About path, not “this is a gap.” |
| **Blocker (`is_blocker` true)** | A **gap** that is also `is_critical`. The happy-path investigation cannot finish without that capability. |
| **Non-blocker** | A gap that is optional or off the happy path. The converted workflow can still run. |
| **Blocked playbook (`is_blocked` true)** | The playbook has at least one blocker gap. |
| **Connector brand** | Vendor/product name on the task (`PAN-OS`, `VirusTotal`), not an Elastic connector id. |
| **`elastic.match`** | `none` (no Elastic connector — backlog), `connector_spec` (spec only), `stack_connector` (ships in the stack). |
| **Approval / HITL** | A human-in-the-loop task (`waitForApproval`, “manually review…”). Not a gap unless something else about the step is unsupported. |
| **`is_critical` on an approval** | That approval sits on the happy path and is not optional (“true” in the approval CSV). |

## Dashboard charts

Time range on the saved dashboard is `now-10y` → `now` so the ingest `@timestamp` is included.

### Headline metrics

- **Playbooks (1,355)** — non-deprecated corpus size in ES. Deprecated content and the `DeprecatedContent` pack are excluded.
- **Blocked playbooks (1,173, 87%)** — playbooks with ≥1 blocker. **182** can convert and still complete the happy path.
- **Blocker gaps (4,442)** — unsupported *tasks* that stop the happy path. One playbook can contribute many (~3.8 blockers per blocked playbook).
- **Non-blocker gaps (1,582)** — unsupported tasks you can skip and still run (optional integrations, side branches, layout/SLA/ML-style work).

Together: **6,024 gaps, 74% blockers**. Most conversion pain is on the default path, not optional fan-out.

### Gaps by blocker flag

Same 6,024 gap events, split by `xsoar.gap.is_blocker`: **true 4,442** / **false 1,582**. This is **task** count, not playbook count.

### Blocker gaps by bucket

Only blocker gaps, by why they are unsupported:

| Bucket | Count | Share | Meaning |
| --- | ---: | ---: | --- |
| **connector_gap** | 3,296 | 74% | Vendor command/brand with no usable Kibana connector step. Product backlog. |
| **mapping_debt** | 877 | 20% | Capability exists in spirit (`setIncident`, send mail, close investigation) but no 1:1 workflow step yet. Engineering mapping, not a new vendor connector. |
| **platform_primitive_gap** | 269 | 6% | Platform features Elastic workflows still lack (ML/DBot, timers/SLA, grid/context helpers). |

Building connectors removes most blockers. Mapping debt is the next slice. Platform primitives are small.

### Top 15 blocker brands with no Elastic connector

Filter: blocker **and** `elastic.match == "none"` **and** brand present. Bar height is **blocker tasks**. Unique playbooks/packs show blast radius.

| Brand | Blocker tasks | Unique playbooks | Unique packs |
| --- | ---: | ---: | ---: |
| PAN-OS | 206 | 70 | 10 |
| Cortex XDR | 154 | 51 | 13 |
| Prisma Cloud | 106 | 35 | 4 |
| Hurukai | 67 | 23 | 1 |
| Recorded Future | 48 | 19 | 1 |
| QRadar | 44 | 18 | 6 |
| MITRE ATT&CK | 39 | 12 | 1 |
| ReliaQuest GreyMatter DRP | 35 | 7 | 1 |
| Active Directory | 33 | 24 | 17 |
| Code42 | 29 | 17 | 1 |
| Rapid7 InsightIDR | 27 | 5 | 1 |
| Qualys | 27 | 13 | 2 |
| ANY.RUN | 24 | 6 | 1 |
| Darkmon | 23 | 11 | 1 |
| Cortex Data Lake | 21 | 3 | 1 |

High tasks **and** many packs (PAN-OS, Cortex XDR, Active Directory) = one connector unblocks many packs. High tasks **and** one pack (Hurukai, Recorded Future) = only needed if that pack is in scope.

Brands that already have Elastic connectors (ServiceNow, Email, CrowdStrike, Slack, Jira, VirusTotal) are absent here on purpose. They can still appear as `connector_gap` until **command-level** mapping exists — see `elastic.match` below.

### Top packs by blocked playbooks

Counts **playbooks** with `is_blocked == true`, grouped by pack folder (not tasks):

| Pack | Blocked playbooks |
| --- | ---: |
| PrismaCloud | 41 |
| CommonPlaybooks | 36 |
| MITRECoA | 36 |
| CortexXDR | 32 |
| PAN-OS | 31 |
| CortexAttackSurfaceManagement | 25 |
| RubrikPolaris / HarfangLabEDR | 24 each |
| RecordedFuture | 22 |
| Code42 | 20 |

**CommonPlaybooks** is shared plumbing: blocking it blocks packs that nest those playbooks. Niche EDR packs look large because almost every playbook *in that pack* is blocked.

### Elastic match for blocker connector gaps

Only blocker gaps in bucket `connector_gap` (3,296 tasks):

| `elastic.match` | Tasks | Meaning |
| --- | ---: | --- |
| **none** | 2,745 (83%) | No Elastic connector — true backlog (previous chart). |
| **null** | 345 | Brandless / unmapped command prefix. |
| **stack_connector** | 157 | Connector already ships (`.servicenow`, `.email`, `.crowdstrike`, …). Blocker is **command mapping**, not “build a connector.” |
| **connector_spec** | 49 | Spec exists (e.g. VirusTotal, Gmail) but is not a stack connector yet. |

“We have CrowdStrike in the stack” does not mean those happy-path XSOAR commands convert. Match tells you which team owns the work: connector product vs workflow mapping.

## Human approval (not on the Kibana dashboard)

257 playbooks have `has_human_approval == true`. Approvals live in `xsoar-workflow-approvals` and `corpus/analysis/approval_inventory.csv`. `waitForApproval` is treated as a supported (tech-preview) primitive and is **not** counted as a blocker.

| `approval_type` | Approval tasks | Unique playbooks | Unique packs | `is_critical` true |
| --- | ---: | ---: | ---: | ---: |
| analyst_judgment | 416 | 223 | 97 | 142 |
| elastic_native | 55 | 50 | 37 | 44 |
| vendor_dependent | 8 | 7 | 6 | 3 |

- **analyst_judgment** — “is this malicious?”, “manually review the incident.” Maps toward `waitForApproval`.
- **elastic_native** — assign / close / severity / tag style work Elastic already models.
- **vendor_dependent** — approval that only makes sense with a vendor console (rare).

“True” in the CSV is **`is_critical`**, not “this is a real approval.”

## What to fund next

1. **Connector backlog (`elastic.match = none`)** — highest leverage: **PAN-OS, Cortex XDR, Prisma Cloud**, then **Active Directory** if pack spread matters.
2. **Mapping debt (~20% of blockers)** — `setIncident`, email, close/link incident. Workflows/platform step mapping, not new vendors.
3. **CommonPlaybooks** — shared nested flows; unblocking it helps many packs.
4. **Command coverage on stack connectors** — 157 blocker connector gaps already have `.servicenow` / `.crowdstrike` / `.email` / etc.

Out of scope for this corpus: publishing converted YAML as live workflows, and changing gap-bucket classification rules.
