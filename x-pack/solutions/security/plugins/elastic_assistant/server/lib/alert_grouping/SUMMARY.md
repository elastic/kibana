# Alert Grouping — Feature Summary

## What It Does

Alert Grouping automatically correlates open security alerts into cases, generates per-case Attack Discoveries, and refines grouping over multiple rounds by rejecting noise alerts. It replaces the manual triage process: instead of an analyst sifting through hundreds of alerts, the system builds coherent attack narratives by grouping related alerts, running AI-powered analysis per group, and iterating until each case tells a clean story.

## How It Works

```
Open Alerts ──► Clustering ──► Cases ──► Attack Discovery ──► Rejection ──► Re-queue
                    │                         │                    │
                    ▼                         ▼                    ▼
            host grouping             AI attack narrative    unrelated alerts
            temporal splits           per-case analysis      get re-processed
            tactic chains             lateral movement       in next round
            process trees             detection
            cross-host links
```

**11-Step Pipeline** (runs on schedule or on-demand):

| Step | What Happens | LLM Required? |
|------|-------------|---------------|
| 1. Fetch alerts | Query open alerts without `llm-triaged` tag | No |
| 2. Extract entities | Pull IPs, hosts, users, hashes from each alert | No |
| 3. Cluster alerts | Group by host → split by time gap → sub-group by MITRE tactic → correlate process trees → link across hosts | No |
| 4. Classify clusters | Label each cluster (e.g. "Credential Theft", "Lateral Movement") | No (rule-based) / Optional (LLM) |
| 5. Match to existing cases | Find existing cases with overlapping entities | No |
| 6. Create / update cases | New case per unmatched cluster; attach to matched case | No |
| 7. Attach alerts | Bulk-attach alerts to their case, auto-extract observables | No |
| 8. Generate Attack Discovery | LLM analyzes each case's alerts to produce an attack narrative | Yes |
| 9. Validate & reject | Alerts the AD didn't reference are detached and un-tagged | No |
| 10. Merge related cases | Merge cases describing the same attack (weighted similarity or LLM) | No (deterministic) / Optional (LLM) |
| 11. Tag alerts | Mark processed alerts `llm-triaged` so they aren't re-scanned | No |

Steps 4 and 10 have **static fallbacks** (rule-based classification and Jaccard similarity) so the feature works without an LLM connector — only Step 8 requires one.

## Key Capabilities

- **Entity-based grouping** — Alerts sharing IPs, hostnames, users, or file hashes land in the same case.
- **Temporal clustering** — Alerts on the same host hours apart become separate cases (configurable window).
- **Cross-host correlation** — Lateral movement between hosts detected via shared rules, network connections, and temporal alignment.
- **Per-case Attack Discovery** — Each case gets a focused AI-generated attack narrative instead of dumping all alerts into one AD.
- **Alert rejection loop** — Alerts the AD deems irrelevant are removed from the case and recycled into the next grouping round, improving quality iteratively.
- **Case auto-enrichment** — Case title and description are updated from AD findings; observables are auto-extracted.
- **Deterministic mode** — Classification, summaries, and case merging work without LLM using MITRE tactic rules and weighted entity overlap.
- **Scheduled execution** — Runs on a configurable interval (e.g. every 15 minutes) via Kibana Task Manager.

## Architecture

```
elastic_assistant/server/lib/alert_grouping/
├── services/
│   ├── entity_extraction_service.ts    # Extract entities from alert fields
│   ├── alert_clustering_service.ts     # Multi-stage clustering pipeline
│   ├── case_matching_service.ts        # Match clusters to existing cases
│   └── static_analysis_service.ts      # Rule-based classification & similarity
├── workflows/
│   └── default_alert_grouping_workflow/
│       └── executor.ts                 # 11-step pipeline orchestrator
├── tasks/
│   └── alert_grouping_task.ts          # Kibana Task Manager integration
├── persistence/
│   └── workflow_data_client.ts         # Workflow config & execution history
├── helpers/
│   └── case_operations.ts             # Shared case CRUD helpers
└── cases/
    ├── observable_auto_extractor.ts    # Auto-extract observables from alerts
    └── case_event_trigger_service.ts   # Trigger actions on case events

routes/alert_grouping/
├── workflow/   → CRUD + execution + history endpoints
├── cases/      → Per-case AD generation, observable extraction, triggers
└── entities/   → Standalone entity extraction endpoint
```

## API Surface

| Endpoint | Purpose |
|----------|---------|
| `POST .../workflow/{id}/_run` | Trigger alert grouping manually |
| `GET  .../workflow/{id}` | Get workflow config |
| `POST .../cases/{id}/_generate_attack_discovery` | Generate AD for a specific case |
| `GET  .../workflow/{id}/executions` | View execution history |
| `POST .../workflow/{id}/_enable` / `_disable` | Toggle scheduled execution |

## Proven End-to-End Flow (Demo)

| Round | Input | Output |
|-------|-------|--------|
| **Round 1** | 32 untriaged alerts across 2 hosts | 3 cases created: "Credential Theft on host-1" (25 alerts), "Credential Theft on host-2" (6), stray (1) |
| **AD Run** | 25 alerts in host-1 case | AD: "Multi-Stage Attack with Credential Theft" (6 MITRE tactics, lateral movement to host-2). **14 alerts rejected** as noise |
| **Round 2** | 14 rejected alerts | New case: "Credential Theft on host-1" (14 reverse-shell alerts) |
| **Round 3** | 15 new + rejected alerts | New case: "Malware Deployment on host-1" (13 alerts) |
| **AD Run** | 13 alerts in malware case | AD: "Multi-Stage Post-Compromise Attack Chain" (5 MITRE tactics). **2 more rejected**. Case title auto-updated |

Each round produces cleaner cases. Rejected alerts form their own meaningful cases in subsequent rounds.

## Configuration

Enable in `kibana.dev.yml`:

```yaml
xpack.securitySolution.enableExperimental: ['alertGroupingEnabled']
```

The workflow is created via API with configurable: schedule interval, alert filters, entity type weights, time proximity window, AD connector, and merge thresholds.
