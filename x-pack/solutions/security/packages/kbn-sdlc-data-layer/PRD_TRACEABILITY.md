# PRD & architecture traceability

Living traceability matrix for the **Development Lifecycle Visibility Platform** against the current Kibana implementation (`@kbn/sdlc-data-layer` + `sdlcIntel` plugin).

| Source document | Version | Location |
| --- | --- | --- |
| Product Requirement Document (PRD) | 1.0 Draft | `Development Lifecycle Visibility Platform.docx` |
| Architecture proposal | 1.0 Draft → **1.1 delta** | `sdlc-platform-architecture.docx` · [ARCHITECTURE_v1.1_DELTA.md](./ARCHITECTURE_v1.1_DELTA.md) |
| Implementation | In progress | `x-pack/solutions/security/packages/kbn-sdlc-data-layer/`, `x-pack/solutions/security/plugins/sdlc_intel/` |

**Last reviewed:** implementation state as of managed workflow v6 (`system-sdlc-github-sync-orchestrator`).

---

## Executive summary

| Area | PRD / architecture target | Current implementation | Fit |
| --- | --- | --- | --- |
| Vision | Read-only, team-aggregated lifecycle visibility | Workflow ingest only; no write-back to GitHub | **Aligned** |
| Phase model | **10 phases** (Product / Engineering / Validation) | **8 gates** on `sdlc-epic-phases` (roadmap mock) | **Partial — different taxonomy** |
| Index design (architecture §5) | **8 indices** + ES Transform `sdlc-phase-durations` | **13 indices** (`github-intel-*` + `sdlc-*`) | **Partial — naming & scope differ** |
| Ingest (architecture §4) | Connector v2 fetch + linkage enrichment + optional `ai.prompt` | Custom GitHub GraphQL + `.github` connector for auth | **Partial** |
| Linkage spine | `epic.id` on every document | Epic key on project items; weak PR/CI/review joins | **Early** |
| Rollout Phase A (weeks 1–6) | Phases **6–9**: PRs, reviews, CI, deploy | GitHub **Projects V2** board sync + P4/P5 ticket/PR rollups | **Different starting point** |
| Dashboards (PRD §4) | 5 Kibana dashboards | HTML prototypes only | **Not started** |
| Agent Builder + MCP (arch §6) | 6 tools, 2 skills, 2 agents | Not registered | **Not started** |
| NFRs | ILM, Spaces RBAC, ZDR LLM | Read-only only | **Partial** |

**Bottom line:** Current code is **Track A** — a GitHub Projects → Elasticsearch foundation with roadmap/epic gate analytics. **Track B** (full PRD lifecycle: reviews, CI, deploy, Transform, Agent Builder) is documented in the architecture v1.1 delta and starts when phases 6–10 are in scope. See [Delivery tracks](#delivery-tracks-track-a--track-b).

---

## Delivery tracks (Track A / Track B)

The PRD describes one platform; **implementation and revised architecture (v1.1 delta) split delivery into two tracks** that share indices but differ in ingest scope and dashboards.

| | **Track A — Roadmap visibility** | **Track B — Full lifecycle** |
| --- | --- | --- |
| **Goal** | Executive roadmap, P-gates, team dimension from GitHub Projects | PRD phases 6–10: review/CI/deploy/SDH, phase durations, correlation |
| **Primary indices** | `github-intel-*`, `sdlc-epic-phases`, `sdlc-team-dimension` | Tier 3: `sdlc-ci-runs`, `sdlc-deployments`, `sdlc-phase-durations`, quality/review/defect indices |
| **Join key** | `epic.key`, `hierarchy.epic`, `content_ref` | + `epic.id` for cross-source events |
| **Ingest** | Custom GraphQL + workflow steps (**shipped**) | REST/webhooks, CI HTTP, BQ, Slack, Drive (**not started**) |
| **Dashboards** | 3 HTML mocks → Kibana (roadmap, pipeline, team) | 5 PRD §4 lifecycle dashboards |
| **Agent Builder** | Optional `sdlc-roadmap-summary` on `sdlc-epic-phases` | Full six-tool surface on lifecycle indices |
| **Status** | **~40%** — ingest + P4/P5 rollups; dashboards pending | **0%** |

**Architecture doc strategy:** Update `sdlc-platform-architecture.docx` to v1.1 using [ARCHITECTURE_v1.1_DELTA.md](./ARCHITECTURE_v1.1_DELTA.md) — document what exists, add only Track B tiers when needed. **No mandatory rename** of `github-intel-*` indices.

### Track A — remaining work

1. Populate `tickets_by_repo` in `buildEpicPhases`
2. Kibana dashboards (executive roadmap, phase pipeline, team dimension)
3. Optional: comments, people, relationships, sync-state ingest
4. ILM + Spaces RBAC

### Track B — when PRD phases 6–10 are required

1. Extend `github-intel-pull-requests` (reviews, board-external PRs)
2. New `sdlc-ci-runs`, `sdlc-deployments` with `epic.id`
3. ES Transform → `sdlc-phase-durations`
4. Quality/review/defect indices + Agent Builder

Full v1.1 section rewrites: [ARCHITECTURE_v1.1_DELTA.md](./ARCHITECTURE_v1.1_DELTA.md).

---

## Naming: architecture proposal vs implementation

The architecture doc defines **eight canonical `sdlc-*` indices**. The current implementation uses a **split model**: raw GitHub intel (`github-intel-*`) plus analytics indices (`sdlc-*`).

| Architecture index (§5.1) | PRD phases | Proposed role | Current equivalent | Status |
| --- | --- | --- | --- | --- |
| `sdlc-epics` | 1–5 | Epic spine; linkage chain fields | `github-intel-project-items` (epic rows) + `sdlc-epic-phases` (rollup doc) | **Partial** — no single upsert spine; no `epic.id` universal key |
| `sdlc-document-quality` | 2, 4 | LLM rubric scores (append-only) | — | **Missing** |
| `sdlc-review-cycles` | 3 | Cross-func review events | — | **Missing** |
| `sdlc-pull-requests` | 6, 7 | PR latency, review depth, AI attribution | `github-intel-pull-requests` | **Partial** — board PRs only; no review timestamps |
| `sdlc-ci-runs` | 8, 9 | CI duration, flakiness | — | **Missing** |
| `sdlc-deployments` | 9 | DORA / deploy events | — | **Missing** |
| `sdlc-production-defects` | 10 | SDH ↔ epic | — | **Missing** |
| `sdlc-phase-durations` ★ | 1–10 | ES Transform derived; dashboard primary | — | **Missing** |
| *(not in arch §5)* | — | — | `github-intel-projects`, `-project-views`, `-repos`, `-teams` | **Extra** — supports Projects V2 roadmap |
| *(not in arch §5)* | — | — | `sdlc-team-dimension` | **Extra** — org team taxonomy (team dashboard) |
| *(not in arch §5)* | — | — | `github-intel-comments`, `-people`, `-relationships`, `-sync-state` | **Schema only** — no ingest |

**Convergence recommendation:** Treat `github-intel-*` as **staging/raw** layers or fold into architecture indices over time. Target spine field: **`epic.id`** (architecture) ≈ **`epic.key` + `project.number` + issue ref** (current). See [Index strategy](#index-strategy-extend-alias-or-new) — renaming is optional; **event ingest + `epic.id` linkage** is not.

---

## Phase models: PRD 10 phases vs `sdlc-epic-phases` P1–P8

The HTML roadmap mocks use **8 gates** (`phases.p1_prd` … `phases.p8_telemetry`). The PRD/architecture use **10 lifecycle phases**. Do not map by number alone.

| PRD phase | Name | Architecture index(s) | `sdlc-epic-phases` gate | Computed today? |
| --- | --- | --- | --- | --- |
| 1 | Idea captured | `sdlc-epics` | — | **No** |
| 2 | PRD drafted | `sdlc-document-quality`, `sdlc-epics` | P1 PRD (`p1_prd`) | **No** — always `ns` |
| 3 ★ | Cross-func review | `sdlc-review-cycles` | — | **No** |
| 4 | Engineering design | `sdlc-document-quality`, `sdlc-epics` | P2 Arch (`p2_arch`) | **No** — always `ns` |
| 5 | Work breakdown | `sdlc-epics` | P4 Tickets (partial) | **Partial** — child item counts |
| 6 | Implementation | `sdlc-pull-requests` | P4 + P5 (partial) | **Partial** — PRs on board |
| 7 ★ | Code review | `sdlc-pull-requests` | — | **No** — needs review events |
| 8 | Testing & QA | `sdlc-ci-runs` | — | **No** |
| 9 | Merge & deploy | `sdlc-ci-runs`, `sdlc-deployments` | P5 PRs (partial) | **Partial** — `merged` flag only |
| 10 | Production validation | `sdlc-production-defects` | P6–P8 | **No** — always `ns` |

**P3 AI coverage** in `sdlc-epic-phases` maps to the **LLM rubric / scope-fit** concept (PRD §3.3), **not** PRD Phase 3 (cross-functional sign-off).

---

## Architecture layers (§3) vs implementation

| Layer | Architecture | Implementation | Status |
| --- | --- | --- | --- |
| **1 Sources** | GitHub, Slack, Drive, CI, BigQuery | GitHub GraphQL only | **Partial** |
| **2 Ingest** | Workflows + Connector v2 + linkage + `ai.prompt` | `sdlcIntel` workflow steps; `.github` connector for token | **Partial** |
| **3 Storage** | 8 indices + ES Transform | 13 indices; no Transform | **Partial** |
| **4 Consume** | Dashboards + Agent Builder + MCP | None in Kibana | **Missing** |

---

## Workflow & step traceability

| Workflow ID | Step | Architecture pipeline | Target index (arch) | Target index (impl) | Status |
| --- | --- | --- | --- | --- | --- |
| `system-sdlc-setup-indices` | `sdlc.setupIndices` | Index bootstrap | all `sdlc-*` | all `github-intel-*`, `sdlc-*` | **Done** |
| `system-sdlc-setup-indices` | `sdlc.seedReferenceData` | Team taxonomy seed | *(reference)* | `sdlc-team-dimension` | **Done** |
| `system-sdlc-github-sync-orchestrator` | `sdlc.syncGithubProjects` | GitHub Projects V2 GraphQL | `sdlc-epics` (partial) | `github-intel-projects`, `-items`, `-views`, `-issues`, `-prs` | **Done** — no linkage enrichment step |
| `system-sdlc-github-sync-orchestrator` | `sdlc.syncGithubOrgCatalog` | Org teams/repos | — | `github-intel-teams`, `-repos` | **Done** |
| `system-sdlc-github-sync-orchestrator` | `sdlc.buildEpicPhases` | Derived epic analytics | would feed `sdlc-phase-durations` | `sdlc-epic-phases` | **Partial** — P4/P5 only; empty `tickets_by_repo` |
| *(planned)* | GitHub connector fetch PRs/reviews | §4.1 GitHub v2 | `sdlc-pull-requests` | — | **Not started** |
| *(planned)* | Slack blocker classify | §4.1 Slack v2 | `sdlc-review-cycles` | — | **Not started** |
| *(planned)* | Drive + `ai.prompt` rubric | §4.1 Drive v2 | `sdlc-document-quality` | — | **Not started** |
| *(planned)* | CI `http.request` | §4.1 Buildkite/GHA | `sdlc-ci-runs` | — | **Not started** |
| *(planned)* | BigQuery SDH | §4.1 | `sdlc-production-defects` | — | **Not started** |
| *(planned)* | ES Transform hourly | §5.1 | `sdlc-phase-durations` | — | **Not started** |

Plugin: `sdlcIntel` · Package: `@kbn/sdlc-data-layer` · Managed workflow owner: `sdlcIntel`.

---

## Field-level traceability (key PRD requirements)

### Linkage chain (PRD §3.2 / arch §4.2)

| Link | Required fields | Current field / location | Workflow step | Status |
| --- | --- | --- | --- | --- |
| Epic root | `epic.id`, `epic.repo` | `epic.key`, `project.number`, `content_ref` on `sdlc-epic-phases` | `buildEpicPhases` | **Partial** |
| PRD URL | `epic.prd_url` | `links.prd_url` (mapping) | — | **Not populated** |
| RFC URL | design doc link | `links.arch_url` (mapping) | — | **Not populated** |
| Child tickets | sub-issues / epic field | `hierarchy.epic`, `hierarchy.ticket_type` on project items | `syncGithubProjects` | **Partial** |
| PRs (closes #) | PR ↔ issue graph | PR docs when on board; `hierarchy.epic` on PR index | `syncGithubProjects` | **Weak** |
| CI runs | check_run events | — | — | **Missing** |
| Reviews | pull_request_review | — | — | **Missing** |
| Deploy | release pipeline | — | — | **Missing** |
| SDHs | SDH Analyzer | — | — | **Missing** |
| Phase durations | timestamps per phase | — | — | **Missing** |

### Analytics fields (executive / phase-pipeline mocks)

| UI need | Index field | Populated? | Status |
| --- | --- | --- | --- |
| Roadmap grouping | `roadmap.id`, `roadmap.product`, `roadmap.initiative` | From `PRODUCT_INITIATIVE_ROADMAP_MAP` | **Partial** — small static map |
| Epic coverage % | `rollup.coverage_pct`, `delivery_coverage_pct` | Computed in `buildEpicPhaseDocument` | **Yes** |
| P4 ticket gate | `phases.p4_tickets.*` | `computeP4Gate`, `rollupTickets` | **Yes** |
| P5 PR gate | `phases.p5_prs.*` | `computeP5Gate`, `rollupPullRequests` | **Yes** |
| Tickets by repo drill-down | `tickets_by_repo[]` | Always `[]` in `buildEpicPhases` | **Schema only** |
| Team attribution | `teams.*` | `attributeTeam()` + seed aliases | **Yes** |
| Cross-team epics | `teams.cross_team`, `team_count` | Computed | **Yes** |
| P1–P3, P6–P8 gates | `phases.p1_prd` … `p8_telemetry` | `notStartedPhase()` | **Placeholder** |

---

## PRD §4 Dashboards & architecture §7

| ID | Dashboard | Primary index (arch) | Implementation | Status |
| --- | --- | --- | --- | --- |
| 4.1 | Phase health heatmap | `sdlc-phase-durations` | — | **Missing** |
| 4.2 | Epic lifecycle trace | `sdlc-phase-durations` | — | **Missing** |
| 4.3 | Bottleneck ranking | `sdlc-phase-durations` | — | **Missing** |
| 4.4 | Leading/lagging correlation | `sdlc-production-defects` | — | **Missing** |
| 4.5 | AI impact attribution | `sdlc-pull-requests` | — | **Missing** |

HTML prototypes (`sdlc_executive_roadmap_dashboard.html`, `sdlc_phase_pipeline_v4.html`, `sdlc_team_dimension_dashboard.html`) are **design references only**.

---

## Agent Builder surface (architecture §6)

| Component | Architecture target | Implementation | Status |
| --- | --- | --- | --- |
| `sdlc-lifecycle-summary` | ES\|QL tool | — | **Missing** |
| `sdlc-epic-trace` | ES\|QL tool | — | **Missing** |
| `sdlc-bottleneck-report` | ES\|QL tool | — | **Missing** |
| `sdlc-prd-quality` | ES\|QL tool | — | **Missing** |
| `sdlc-defect-correlation` | ES\|QL tool | — | **Missing** |
| `sdlc-review-load` | ES\|QL tool | — | **Missing** |
| `sdlc-lifecycle-analyst` skill | Agent Builder skill | — | **Missing** |
| `sdlc-quality-correlator` skill | Agent Builder skill | — | **Missing** |
| `sdlc-director-agent` | directors-space | — | **Missing** |
| `sdlc-teamlead-agent` | team-space | — | **Missing** |
| MCP App | `/api/agent_builder/mcp` | — | **Missing** |

---

## Rollout alignment (revised — Track A / Track B)

Supersedes v1.0 architecture §8 single-path phases A–D. See [ARCHITECTURE_v1.1_DELTA.md §8](./ARCHITECTURE_v1.1_DELTA.md#8-rollout-replace-v10-8).

| Phase | Weeks | Scope | Current progress |
| --- | --- | --- | --- |
| **A1** | 1–4 | Track A ingest hardening (`tickets_by_repo`, sync-state, filters) | **~50%** — core sync shipped |
| **A2** | 5–8 | Track A dashboards (3 mocks → Kibana) | **0%** |
| **A3** | 9–10 | ILM, Spaces RBAC, connector OAuth | **0%** |
| **B1** | 11–16 | Engineering events; CI/deploy indices; `epic.id` | **~15%** — board PR snapshots only |
| **B2** | 17–20 | ES Transform; SDH index; lifecycle dashboards | **0%** |
| **B3** | 21–24 | Document quality, Slack review cycles | **0%** |
| **B4** | 25–28 | Agent Builder tools/skills/agents; MCP | **0%** |

**Decision gate (A → B):** Leadership requires PRD metrics for phases 6–10 (review latency, CI, deploy, SDH correlation).

---

## NFR traceability (PRD §6 / arch §9)

| NFR | Requirement | Implementation | Status |
| --- | --- | --- | --- |
| 001 | No individual developer scoring | No dashboards yet; ingest stores assignees on issues | **OK so far** — enforce in ES\|QL/tools when built |
| 002 | Burnout signals team-level only | — | **N/A until review-load exists** |
| 003 | Read-only integrations | Sync workflows index only | **Met** |
| 004 | LLM via enterprise gateway, ZDR | — | **N/A until `ai.prompt` steps** |
| 005 | 12-month ILM | Default index settings; no ILM policy | **Not configured** |
| 006 | Role-gated access (Spaces) | No Kibana feature / space wiring | **Not configured** |

---

## PRD success metrics (§8) — measurable?

| Metric | Target | Can measure today? |
| --- | --- | --- |
| Phase coverage | All 10 phases instrumented | **No** — ~3 weak signals |
| Epic linkage rate | 80%+ idea → production | **No** — chain incomplete |
| Bottleneck accuracy | 75% team agreement | **No** |
| Leading/lagging correlation | p < 0.05 (Phase 2 vs 10) | **No** |
| Leadership adoption | Qualitative | **No** |
| Time-to-insight | < 5 min via dashboard | **No** |

---

## Index strategy: extend, alias, or new

Architecture doc index names (`sdlc-pull-requests`, etc.) describe a **data model**, not a requirement to create duplicate indices. Choose per domain:

| Domain | Architecture name | Current index | Recommended approach | Why |
| --- | --- | --- | --- | --- |
| Pull requests | `sdlc-pull-requests` | `github-intel-pull-requests` | **Extend existing** (+ optional alias later) | Index exists; gap is **scope** (board-only) and **fields** (no review timestamps), not the name |
| CI runs | `sdlc-ci-runs` | — | **New index** | No equivalent today; different source (Buildkite/GHA), append-only event shape |
| Deployments | `sdlc-deployments` | — | **New index** | No equivalent today; deploy webhooks / pipeline events |
| Epic spine | `sdlc-epics` | `github-intel-project-items` + `sdlc-epic-phases` | **Extend + enrich** | Add `epic.id` during linkage; keep split raw vs rollup until Transform exists |
| Phase durations | `sdlc-phase-durations` | — | **New (Transform dest)** | Derived index; reads PR + CI + deploy sources |

### What is actually required

To reach PRD Phase A and architecture §8, you need:

1. **Event ingest** for PR reviews, check runs, and deploys (not just GitHub Projects board cards).
2. **Linkage enrichment** that stamps a stable **`epic.id`** on every document (PR, CI run, deploy) — resolved from issue graph (`closes #`), epic issue ref, labels, branch names; not only the Projects custom-field string in `hierarchy.epic`.
3. **Derived phase durations** (ES Transform or batch job) keyed on `epic.id`.

Index **renaming** is optional and mainly helps when dashboards and Agent Builder tools reference architecture doc names.

### When to use each option

| Option | Use when | Example |
| --- | --- | --- |
| **Extend existing** | Index already exists; mapping can absorb new fields | Add `epic.id`, `review.first_submitted_at`, `time_to_merge` to `github-intel-pull-requests` |
| **Alias** | Stable query name for dashboards/tools without reindex | `sdlc-pull-requests` → alias of `github-intel-pull-requests` |
| **New index** | New event type, different ingest, or append-only semantics | `sdlc-ci-runs`, `sdlc-deployments`, Transform output `sdlc-phase-durations` |

### What we have today vs what Phase A needs

| Capability | `github-intel-pull-requests` today | Phase A target |
| --- | --- | --- |
| Source | Projects V2 board PR cards only | All PRs linked to epic (board + `closes #` + refs) |
| Join key | `hierarchy.epic` (Projects field label) | `epic.id` (canonical, cross-index) |
| Review metrics | None | First review, review count, time-to-merge |
| CI / deploy | Not in this index | Separate `sdlc-ci-runs` / `sdlc-deployments` with same `epic.id` |

**Roadmap-only scope:** If the goal stays executive roadmap from GitHub Projects (`sdlc-epic-phases` P4/P5 gates), you can defer CI/deploy indices and `epic.id` linkage. Full lifecycle visibility (PRD §4 dashboards, architecture Phase A) requires the event streams above.

---

## Recommended convergence path

Two paths — pick based on active track. Architecture v1.1 documents **Track A first**; see [ARCHITECTURE_v1.1_DELTA.md](./ARCHITECTURE_v1.1_DELTA.md).

### Track A (recommended near-term)

1. **Populate `tickets_by_repo`** in `buildEpicPhases` for executive mock parity.
2. **Optional enrichment:** PRD/RFC URLs from project fields → `links.*` on `sdlc-epic-phases`.
3. **Kibana dashboards:** executive roadmap, phase pipeline, team dimension from HTML mocks.
4. **Ops:** ILM + Spaces RBAC on `github-intel-*` / `sdlc-*`.
5. **Optional ingest:** comments, people, relationships, sync-state writes.

### Track B (when PRD phases 6–10 are in scope)

1. **Add `epic.id` linkage** on ingest for cross-source joins.
2. **Extend `github-intel-pull-requests`** with review/merge timestamps and non-board PRs.
3. **Create** `sdlc-ci-runs`, `sdlc-deployments` (append-only events with `epic.id`).
4. **GitHub event ingest** via Connector v2 / webhooks: reviews, check runs.
5. **ES Transform → `sdlc-phase-durations`**; lifecycle dashboards (PRD §4.1–4.3).
6. **BigQuery → `sdlc-production-defects`**; Drive/Slack/LLM indices (PRD phases 2–4, 10).
7. **Agent Builder** six ES\|QL tools + MCP (arch §6).

Index rename/alias is **optional** at any step — see [Index strategy](#index-strategy-extend-alias-or-new).

---

## Document maintenance

Update this file when:

- A workflow step or index mapping changes
- Architecture index names are adopted or aliased
- A PRD phase gains its first throughput metric
- Agent Builder tools or dashboards ship

Related code entry points:

- Indices & mappings: `src/constants/indices.ts`, `src/mappings/index.ts`
- Phase gates: `src/lib/phase_gates.ts`, `src/lib/build_epic_phases.ts`
- Ingest: `x-pack/solutions/security/plugins/sdlc_intel/server/services/sdlc_data_layer_service.ts`
- Workflows: `src/platform/packages/shared/kbn-workflows/managed/definitions/sdlc_intel/`
