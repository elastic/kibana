# Persona Matrix — Gap Analysis (Updated 2026-07-22)

## Status: Reports structurally match Dhru's originals. Multi-model infra landed.

## What's Working ✅

1. **Persona matrix eval suite** — 21 prompts across 7 categories, committed to Kibana
2. **Per-example skill evaluators** — `createExampleScopedSkillInvocationEvaluator` correctly checks each prompt's expected skill
3. **Score ingestion** — docs land in `.evaluation-scores*` with `task.model` and `evaluator.model` metadata
4. **`generate_reports.py`** — produces 4 HTML reports from ES score docs or cached JSONL
5. **`agent_eval_full.html`** — per-prompt responses + step traces, expandable cards
6. **`llm_persona_matrix.html`** — Dhru's CSS/JS, role picker cards, full performance matrix, methodology
7. **`token_usage_overview_matrix.html`** — dark-mode, per-model-per-category tables, avg+range annotations
8. **`index.html`** — landing page with report cards

## Structural Parity vs Dhru's Originals

| Feature | Dhru | Ours | Status |
|---------|------|------|--------|
| Role picker cards | 7 roles | 6 roles | ✅ Dynamic, weighted scores |
| Full performance matrix | ✅ | ✅ | ✅ Multi-model sortable |
| Token efficiency legend | ✅ | ✅ | ✅ |
| Methodology section | ✅ | ✅ | ✅ |
| Dark-mode token report | ✅ | ✅ | ✅ 7 category tables |
| Vendor badges | ✅ | ✅ | ✅ Anthropic/OpenAI/Google |
| Workflow chooser | ✅ | ❌ | Stub — needs per-workflow scoring |
| Open-source models | ✅ | ❌ | N/A until we test OSS models |
| Legend & notes | ✅ | ❌ | Can add |

## Gaps Remaining

### 1. Multi-Model Data (HIGH)
Current cache has 1 model (Claude 4.5 Haiku). Dhru's originals have 25+ models.
**Fix:** Run eval suite against Sonnet 5, Opus 4.7, Gemini 2.5, GPT-5.2 with same prompts.

### 2. Skill Invoked = 0 (HIGH — Functional)
`createExampleScopedSkillInvocationEvaluator` uses trace-based skill detection but router may still not select skills correctly.
**Fix:** Verify with a live eval run that traces show `gen_ai.tool.name` matching expected skill. Check `AGENT_BUILDER_BUILTIN_SKILLS` for registration.

### 3. Workflow Chooser Section (MEDIUM)
Missing "Or choose by workflow" section with per-workflow top model recommendations.
**Fix:** Add workflow→category mapping and generate recommendation cards similar to role picker.

### 4. Attack Discovery Report (MEDIUM)
`generate_ad_report.py` exists but requires Dhru's external renderer and live ES data.
**Fix:** Port AD HTML generation into `generate_reports.py` or document the separate script workflow.

### 5. Open-Source / Self-Managed Section (LOW)
 Dhru has a section for air-gapped deployments with vLLM/Ollama models.
 **Fix:** Add when we test local models (not currently planned).

### 6. CI Provenance Footer (LOW)
 Reports don't show build_url, commit_sha, or CI run id.
 **Fix:** Read `metadata.git` and `metadata.ci` from score docs.

## Changes Made This Session

1. **Fixed dhru_persona.css injection** — now extracts only `<style>` block, preventing duplicate HTML body fragments
2. **Added dynamic role picker** — 6 weighted role cards with top model + runner-up recommendations
3. **Added "Full performance matrix" heading** — matches Dhru's section hierarchy
4. **Added "How we test" methodology card** — dynamic content from actual eval parameters
5. **Updated report generator** in `scripts/generate_reports.py` with all enhancements
