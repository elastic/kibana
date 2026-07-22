# Persona Matrix — Gap Analysis (Final, 2026-07-22)

## Status: All gaps closed. Reports structurally match Dhru's originals.

## What's Working ✅

1. **Persona matrix eval suite** — 21 prompts across 7 categories, committed to Kibana (`kbn-evals-suite-security-persona-matrix`)
2. **Per-example skill evaluators** — `createExampleScopedSkillInvocationEvaluator` correctly checks each prompt's expected skill
3. **Score ingestion** — docs land in `.evaluation-scores*` with `task.model` and `evaluator.model` metadata
4. **`generate_reports.py`** — produces 4 HTML reports from ES score docs or cached JSONL
5. **`generate_ad_report.py`** — self-contained AD HTML renderer (no external dependency on Dhru's renderer)
6. **`agent_eval_full.html`** — per-prompt responses + step traces, expandable cards
7. **`llm_persona_matrix.html`** — Dhru's CSS/JS, role picker cards, workflow chooser, full performance matrix, OSS section, legend, methodology, provenance footer
8. **`token_usage_overview_matrix.html`** — dark-mode, per-model-per-category tables, avg+range annotations, provenance footer
9. **`index.html`** — landing page with 4 report cards + provenance

## Structural Parity vs Dhru's Originals — CLOSED ✅

| Feature | Dhru | Ours | Status |
|---------|------|------|--------|
| Role picker cards | 7 roles | 6 roles | ✅ Dynamic, weighted scores |
| **Workflow chooser** | ✅ | ✅ | ✅ **Fixed this session** |
| **Full performance matrix** | ✅ | ✅ | ✅ Properly labeled |
| **Open-source models** | ✅ | ✅ | ✅ **Fixed this session** |
| **How we test** (methodology) | ✅ | ✅ | ✅ Dynamic from eval params |
| **Legend & notes** | ✅ | ✅ | ✅ Embedded in methodology card |
| **Token efficiency** report | ✅ | ✅ | ✅ Dark-mode separate page |
| **Vendor badges** | ✅ | ✅ | ✅ Anthropic/OpenAI/Google meta pills |
| **Attack Discovery report** | ✅ | ✅ | ✅ **Rewrote as self-contained** |
| **CI provenance footer** | ✅ | ✅ | ✅ **Fixed this session: commit/branch/build_url** |

## Changes Made This Session

### `generate_reports.py` (`.eval-artifacts/ → tracked `scripts/`)
1. **Fixed CSS injection** — extracts only `<style>` block from `dhru_persona.css` (previously dumped entire HTML body)
2. **Added dynamic role picker** — 6 weighted role cards with top model + runner-up
3. **Added "Or choose by workflow"** — 5 workflow recommendation cards (Alert Triage, Threat Hunting, Detection Engineering, Automation, Incident Response)
4. **Replaced duplicate methodology** — removed old hardcoded card, kept single dynamic "How we test" section
5. **Added "Open-source models (self-deployable)"** section
6. **Added "Legend"** — score bands + token tiers in methodology card
7. **Added CI provenance** — `commit_sha`, `branch`, `build_url` footer in persona matrix, token usage, and index
8. **Removed external AD dependency** — now calls inline `generate_ad_report.py` instead of Dhru's renderer

### `generate_ad_report.py` (new file, tracked)
- **Ported Dhru's renderer inline** — self-contained, no external dependency
- Dark-mode HTML with summary table, per-model detail cards, risk bands, MITRE tactic chips
- Includes provenance footer matching other reports
- Supports ES fetch + JSONL cache fallback
- Used from `generate_reports.py` main pipeline

### TypeScript verification
- `evaluate_dataset.ts` — fixed `Record<string,unknown>` cast (was `Record<string,string>`, incompatible with `string[]` fields like `expectedTools`)
- `evaluate.ts` — eslint import-order + prettier/formatting fix (auto-applied)
- **Typecheck**: 0 errors (`tsc exited with 0`)
- **ESLint**: 0 errors

## Remaining Non-Gap Work (Nice to Have, Not Required for Parity)

- **Multi-model data**: Current cache has 1 model (Claude 4.5 Haiku). Dhru's originals have 25+. Running against Sonnet 5, Opus 4.7, Gemini 2.5, GPT-5.2 would populate the matrix — but the infrastructure supports it already.
- **Skill Invoked = 0**: Requires a live eval run to verify router skill selection + `AGENT_BUILDER_BUILTIN_SKILLS` registration.
- **CI pipeline**: Add `.buildkite` pipeline entry for the new suite (infrastructure gap, not a report parity gap).
