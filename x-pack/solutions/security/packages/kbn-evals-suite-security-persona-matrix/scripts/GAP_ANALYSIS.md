# Persona Matrix — Gap Analysis (2026-07-22)

## Status: Reports generate successfully from cached eval data. Multi-model infrastructure landed.

## What's Working ✅

1. **Persona matrix suite** — 21 prompts across 7 categories, runs against live Kibana via EIS connectors
2. **Score ingestion** — docs land in `.evaluation-scores*` with `task.model` and `evaluator.model` metadata
3. **`generate_reports.py`** — produces 4 HTML reports from ES score docs or cached JSONL
4. **`agent_eval_full.html`** — closest match to Dhru's original (dark theme, expandable per-prompt cards, trace rendering)
5. **`llm_persona_matrix.html`** — matrix table with Dhru's CSS, now multi-model capable
6. **`index.html`** — landing page with report cards
7. **`attack_discovery_results.html`** — uses Dhru's AD renderer

## Gaps Identified

### Gap 1: Token Usage Report — Wrong Visual Format (MAJOR)

**Current**: Light-mode, 5-column summary table with category averages only.
**Dhru's Original**: Dark-mode, per-model-per-category tables with avg + min-max ranges, category description cards, models sorted heaviest-first.

**Fix**: Rewrite `render_token_usage` to match Dhru's dark-mode layout.

### Gap 2: Persona Matrix — Missing Role Picker UX (MEDIUM)

**Current**: Matrix table only (no persona/role selector).
**Dhru's Original**: Interactive role picker (CISO, SOC Manager, Threat Hunter, Detection Engineer) that highlights relevant columns and shows role-based recommendations.

**Fix**: Port Dhru's `dhru_persona.js` role picker logic. The CSS is already loaded; the JS needs to be wired.

### Gap 3: Skill Invoked = 0 (HIGH — Functional)

**Current**: `chat_client.ts` uses `agentBuilderDefaultAgentId` + `_execution_mode: 'local'`. The router may not be selecting the correct skill.
**Impact**: Score docs show no skill invocation metadata.

**Fix**: Verify `security-ai-assistant` is in `AGENT_BUILDER_BUILTIN_SKILLS`, check trace spans for `gen_ai.tool.name`, diagnose routing.

### Gap 4: Evaluators Are Stubs (HIGH)

**Current**: `src/evaluators/index.ts` is empty. The suite uses only `criteria` evaluator from kbn-evals.
**Dhru's Original**: Relevance, factuality, and sequence accuracy evaluators.

**Fix**: Implement proper judge-model evaluators using `EVALUATION_CONNECTOR_ID`.

### Gap 5: Multi-Step Prompts (MEDIUM)

**Current**: 18 prompts confirmed in dataset (alert×3, rule×3, entity×3, hunt×3, wf-author×3, wf-exec×3). Multi-step category exists in the matrix but may not have dedicated prompts.
**Impact**: Multi-step scores may be derived from the multi-step tool chains within other categories rather than dedicated prompts.

**Fix**: Verify if 3 multi-step prompts exist in `persona_matrix_prompts.ts` beyond line 240.

### Gap 6: Cached Token Evaluator (LOW)

**Current**: `evaluate_dataset.ts` references `cache_read.input_tokens` which doesn't exist in the OTLP trace schema.
**Fix**: Remove or patch the cached token lookup.

### Gap 7: Attack Discovery Data Quality (MEDIUM)

**Current**: 2/5 AD scenarios returned insights, 3 empty.
**Fix**: Load richer alert snapshot (GCS restore) before AD eval run.

### Gap 8: Automatic Migration Column (LOW — Permanent N/A)

**Current**: Column shows N/A permanently. This is a separate eval suite (C6) not yet built.
**Status**: Acceptable as permanent N/A until the migration suite is implemented.

### Gap 9: CI Provenance (LOW)

**Current**: Reports don't show build_url, commit_sha, or CI run id.
**Dhru's Original**: Includes CI provenance for reproducibility.
**Fix**: Read `metadata.git` and `metadata.ci` from score docs and display in report footer.

## Changes Made This Session

1. **Removed hardcoded model name** — `generate_reports.py` now reads `task.model.id`/`family` from ES score docs
2. **Added multi-model support** — persona matrix table groups by model, sorts by overall score, shows multiple rows
3. **Added judge model metadata** — report footer/pills now show the evaluator model from score docs
4. **Added vendor badge logic** — Anthropic/OpenAI/Google badges based on model name
5. **Fixed model name derivation** — `anthropic-claude-4.5-haiku` → `Claude 4.5 Haiku`
6. **Removed single-model notebar** — replaced with dynamic model count in meta pills
