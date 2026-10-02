# @kbn/evals-suite-security-persona-matrix

Breadth-first security LLM performance suite: 21 prompts across 7 skill categories,
designed for multi-model comparison and persona-driven reporting.

## Categories

| Category | Prompts | Primary skills tested |
|---|---|---|
| Alert Analysis | 3 | alert-analysis |
| Detection Rule Edit | 3 | detection-rule-edit |
| Entity Analytics | 3 | entity-analytics |
| Threat Hunting | 3 | threat-hunting |
| Workflow Authoring | 3 | workflow-authoring |
| Workflow Execution | 3 | workflow-authoring, cases-management |
| Multi-Step | 3 | alert-analysis (+ allowSkills) |

## Evaluators

- **Skill Invocation** — verifies the correct skill was activated via trace inspection
- **ExpectedToolCalled** — checks the primary expected tool was invoked (from `expectedTools` metadata)
- **Trajectory** — tool-call sequence similarity vs golden path
- **correctnessAnalysis** — structured LLM judge (Factuality, Relevance, Completeness)
- **groundednessAnalysis** — structured LLM judge for response groundedness
- **Criteria** — generic rubric (Relevance, Clarity, Accuracy, Completeness)
- **Trace-based** — input tokens, output tokens, cached tokens, tool calls, latency

## Fixtures

- **Chrysalis alerts** — seeds 3 sample alerts before evaluation, cleaned up after

## Seed profiles (`SEED_PROFILE`)

- **`minimal` (default)** - 3 sample alerts + 1 rule. Matches the published matrix runs; scores are directly comparable with them.
- **`parity`** - 97-doc snapshot of the original `chrysalis-sim` benchmark dataset (5-stage APT chain: needle/noise alerts, endpoint telemetry, Rapid7 IOCs, on-call schedule) across 8 indices, from `fixtures/chrysalis_parity_docs.ts`. Timestamps are re-stamped relative to run time. Use for apples-to-apples comparison against the original benchmark. Scores under `parity` are NOT comparable with `minimal` runs - the environment differs by design.

### Prerequisites for `SEED_PROFILE=parity`

Entity-analytics examples call `security_search_entities` / `security.get_entity`, which are only available when the **Security entity store is installed**. On a fresh stack, run once before the suite:

```bash
curl -u <creds> -X POST "<kibana>/api/security/entity_store/install" -H "kbn-xsrf: x" -H "Content-Type: application/json" -d "{}"
```

The store auto-starts after install (`.entities.v2.latest.security_default`). Without it, those examples hard-fail on tool-availability checks.
