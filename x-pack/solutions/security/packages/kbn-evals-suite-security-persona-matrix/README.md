# @kbn/evals-suite-security-persona-matrix

Breadth-first security LLM performance suite: 21 prompts across 7 skill categories,
designed for multi-model comparison and persona-driven reporting.

## Categories

| Category | Prompts | Primary skills tested |
|---|---|---|
| Alert Analysis | 3 | alert-analysis |
| Detection Rule Edit | 3 | detection-rule-creation |
| Entity Analytics | 3 | entity-analytics |
| Threat Hunting | 3 | threat-intel-hunt |
| Workflow Authoring | 3 | workflow-authoring |
| Workflow Execution | 3 | security-tools |
| Multi-Step | 3 | alert-analysis, security-tools, workflow-authoring |

## Evaluators

- **Skill Invocation** — verifies the correct skill was activated via trace inspection
- **ExpectedToolCalled** — checks the primary expected tool was invoked (from `expectedTools` metadata)
- **Trajectory** — tool-call sequence similarity vs golden path
- **CorrectnessAnalysis** — structured LLM judge (Factuality, Relevance, Completeness)
- **AB Correctness** — Agent Builder correctness evaluators
- **Criteria** — generic rubric (Relevance, Clarity, Accuracy, Completeness)
- **Trace-based** — input tokens, output tokens, cached tokens, tool calls, latency

## Fixtures

- **Chrysalis alerts** — seeds 3 sample alerts before evaluation, cleaned up after

## Report generation

The `scripts/` directory contains a TypeScript report generator that fetches score
documents from Elasticsearch and produces persona matrix HTML reports.

```bash
# From the scripts/ directory
KBN_EVALS_ES_URL=http://localhost:9222 npx tsx generate_reports.ts
```

Outputs:
- `llm_persona_matrix.html` — role-based model selection matrix
- `token_usage_overview_matrix.html` — per-category token efficiency
- `attack_discovery_results.html` — attack discovery model comparison
- `index.html` — report landing page
- `agent_eval.jsonl` — raw per-prompt evaluation data
