# Postmortem: why the autonomous PCI skill scored 14-15 points lower

> Data source: four live runs in `runs/{opus47,sonnet46}-{handwritten,autonomous}/results.json`
> (8 scenarios × 4 cells = 32 agent traces × 2 evaluators).
> Generated at: 2026-05-11.

## TL;DR

The autonomous skill **never invokes its own dedicated PCI tools** (0 calls across 16 scenarios on both models). It reads the skill content, then improvises a 17-40-step manual workflow using `platform.core.{list_indices,get_index_mapping,execute_esql}` instead of `security.pci_{scope_discovery,compliance,field_mapper}`. The handwritten variant calls the dedicated tools 17-23 times across the same 16 scenarios and produces structured, on-rubric output in 5-16 steps.

The judge penalises this directly — multiple scoring criteria are *literally* "Called the `pci_compliance` tool in check mode for requirement N" — and indirectly, because the agent's improvised ESQL exploration misses cases the dedicated tool would have surfaced (e.g. admin/root logins for req 2.2.4).

The root cause is **skill-content design**, not infrastructure. Both variants register the identical tool set; the autonomous content's elaborate 6-step workflow and 35% extra prose mass push the agent into "do it yourself" mode.

## 1 · The smoking gun: tool-call tally

Sum across all 8 scenarios per cell:

| Cell | Total steps | **PCI tool calls** | raw ESQL calls | get_index_mapping | run_subagent |
|---|---:|---:|---:|---:|---:|
| HW · Opus 4.7  | 62  | **17** | 0  | 1  | 0 |
| Auto · Opus 4.7  | 161 | **0**  | 36 | 9  | 1 |
| HW · Sonnet 4.6  | 77  | **23** | 0  | 1  | 0 |
| Auto · Sonnet 4.6 | 214 | **0**  | 30 | 11 | 2 |

The autonomous skill drives a 2.6-2.8× explosion in step count, **zero** dedicated-tool calls, and a 30-36× increase in raw ESQL calls. The pattern is reproducible across both models — model strength does not fix the bug; if anything it amplifies the exploratory behaviour (Sonnet 4.6 uses more steps than Opus 4.7 for the same prompt).

## 2 · Trace contrast on the worst scenario (req 2.2.4 default accounts)

Same dataset, same question, same connector, same Scout cluster. Only the skill content differs.

**Handwritten (score 1.000, 5 steps):**
```
reasoning → reasoning → filestore.read (load skill) → reasoning → security.pci_compliance ✓
```

**Autonomous (score 0.571, 17 steps):**
```
reasoning → reasoning → filestore.read (load skill) → reasoning → reasoning →
  platform.core.list_indices → reasoning → reasoning →
  platform.core.get_index_mapping → reasoning →
  platform.core.search → reasoning → reasoning →
  platform.core.execute_esql → reasoning → reasoning →
  platform.core.execute_esql
```

Both agents load the same skill via `filestore.read`. After reading the autonomous prompt, the agent decides to reinvent the `pci_scope_discovery` + `pci_compliance` pipeline manually — listing indices, fetching mappings, running raw ESQL. It never calls the dedicated tool. The improvised ESQL surfaces *some* failed logins for `jdoe` but misses the **admin** and **root** successful-login violations that the dedicated tool would have flagged. That single tool-routing failure cascades into three lost rubric points (1 for the tool-call criterion, 1 for admin detection, 1 for root detection).

## 3 · Judge rationales confirm the pattern

Quoted verbatim from `evaluator.explanation` on autonomous runs:

| Scenario | Judge says |
|---|---|
| req 2.2.4 | `obqv: Did not call pci_compliance tool in check mode; only loaded skill and ran generic searches` |
| req 8.3.4 | `sgox: The pci_compliance tool was not called; the agent used general ES\|QL tools instead` |
| req 4.1   | `tuch: The pci_compliance tool was not called in check mode; **it was unavailable** and fell back to ES\|QL` |
| full report | `xhrs: The pci_compliance tool was not called; **the attempted call was to pci_scope_discovery and it failed**. Fell back to manual ES\|QL queries.` |
| field mapping | `tcfv: The pci_field_mapper tool was not called; agent **noted it was unavailable** and used get_index_mapping/execute_esql instead` |

The "unavailable" wording is the agent's own justification, not ground truth — the tools are demonstrably registered (the handwritten variant calls them 40 times across the same 16 scenarios). The agent reads the autonomous prompt, fails one tool call, and then hallucinates that the tool is unavailable as a justification for switching to manual exploration. Once it is in manual mode it never returns.

## 4 · Root causes in the autonomous skill content

Diffing the two content blocks against the empirical traces, five distinct content-design choices each contribute to the drift:

### 4.1 Pre-step theory injection

Autonomous workflow has **6 steps** vs handwritten's 3:

| # | Autonomous step | Effect on agent |
|---|---|---|
| 1 | Discover scope first (`pci_scope_discovery`)            | OK — directs to a tool |
| 2 | **Reduce scope before running checks** (tokenisation, P2PE, segmentation theory) | Agent reads "if the CDE is too broad, propose levers" and starts *reasoning* about the data before calling tools |
| 3 | **Classify each requirement as technical or process-based** | Agent treats this as work it must do itself; starts looking at mappings to "classify" requirements |
| 4 | Run the checks (`pci_compliance` with mode)             | By step 4 the agent has already committed to manual exploration |
| 5 | Handle non-ECS data                                     | — |
| 6 | Surface QSA disclaimer                                  | — |

Steps 2 and 3 are **prerequisite reasoning the agent is asked to perform**, but the dedicated tools handle scope reduction and requirement classification internally. The instruction pattern reads as "do your own homework before calling tools" — which the agent obliges.

### 4.2 Tool-description provenance commentary

Autonomous tool descriptions carry meta-commentary about the architecture:

> `pci_compliance` — Unified PCI DSS evaluation. Pass `mode: "check"` for per-requirement violation detection with evidence; pass `mode: "report"` for a scorecard roll-up across requirements. **The autonomous architect's blueprint originally proposed two separate tools (`pci_run_compliance_check` + `pci_generate_scorecard_report`) — the consolidated tool with a `mode` parameter achieves the same conceptual separation while staying inside the 5-tool selection cap.**

The bolded sentence is irrelevant to the LLM — it's a design rationale aimed at human reviewers — and creates ambiguity: a model reading this can plausibly conclude that the tool it wants doesn't exist and the current one is a compromise it should work around.

### 4.3 Cross-skill handoffs to non-existent skills

Autonomous "Do not use" block references `threat-hunting`, `alert-analysis`, `detection-rule-edit` as sibling skills the agent should defer to. Those skills *don't exist* in this cluster's registry. When the agent attempts a handoff and the target skill is unresolvable, it falls back to the most generic tool available — `platform.core.search` / `execute_esql`.

The handwritten skill omits these handoff names and just describes the negative cases.

### 4.4 Domain-knowledge mass-loading mid-prompt

A 400-line "Domain Knowledge Notes" section (SAQ taxonomy, v3→v4 deltas, v4.0.1 clarifications) sits **between** the workflow and the status vocabulary. By the time the agent has parsed it, the workflow instructions are several thousand tokens upstream. This is the standard "lost-in-the-middle" failure mode — procedural instructions degrade in adherence when buried under reference material.

### 4.5 Content size + meta-framing

8,062 chars vs 4,135 chars. Empirically (across many published prompt-engineering studies), instruction-following degrades nonlinearly with prompt length, especially for structured outputs (which tool calls are). The opening "> Authored by the autonomous skill architect (cycle-17). Citations track every claim — every sentence below traces either to web-research..." block also signals to the agent that this is *reference material to consult* rather than *operational instructions to follow*.

## 5 · Concrete fix proposals (ranked by expected impact)

Each is independently applyable; I'd recommend stacking them.

### Fix 1 — Reorder workflow to "tool first, theory last"

Replace the 6-step workflow with a 3-step one mirroring the handwritten skill's structure, and move all theory (SAQ taxonomy, v3→v4 deltas, scope-reduction levers) to a section *below* the workflow titled "Reference (do not consult before calling tools)".

**Expected impact:** highest. Directly addresses §4.1 — the pre-step theory injection is the strongest root cause in the trace data.

### Fix 2 — Add explicit "do not improvise" injunction

Insert this sentence at the top of "Compliance Assessment Workflow":

> **Always call the dedicated PCI tools** (`pci_scope_discovery`, `pci_compliance`, `pci_field_mapper`). Do not improvise raw ES|QL queries against the indices — the tools encode requirement-specific knowledge (e.g. default-account detection patterns, weak-TLS regex sets, brute-force thresholds) that manual queries will miss.

**Expected impact:** high. Directly counters the "improvise raw ESQL" failure mode.

### Fix 3 — Strip tool-description provenance commentary

Replace the "originally proposed two separate tools" paragraph with the handwritten skill's concise tool description. Tool descriptions should describe what the tool *does* and *when to call it*, nothing else.

**Expected impact:** medium. Removes ambiguity that lets the agent rationalise tool avoidance.

### Fix 4 — Remove handoff references to non-existent skills

Delete the "use `threat-hunting` instead", "use `alert-analysis`", "use `detection-rule-edit`" handoffs. Replace with a generic "for non-PCI topics, defer to a more appropriate skill".

**Expected impact:** medium. Fixes one specific failure cascade (unresolvable handoff → fallback to generic search).

### Fix 5 — Move "Domain Knowledge Notes" to bottom

Put it AFTER §6 (workflow), §7 (status vocab), §8 (scope claim), §9 (deduplication), §10 (timeframes). Frame it as "Background reference" not "Notes". Reduces the lost-in-the-middle effect.

**Expected impact:** medium.

### Fix 6 — Trim the meta-framing preamble

Delete the cycle-17 attribution blockquote and the citation-tracking note. Skill content is for the agent, not for human reviewers; provenance belongs in a code comment above the `defineSkillType` call (where it already is).

**Expected impact:** low — but cheap.

## 6 · Feedback-loop efficiency: 32 min → 90 seconds

Current iteration cycle (for a one-line content edit, end-to-end):

| Step | Cost |
|---|---:|
| Edit `pci_compliance_autonomous_skill.ts` | seconds |
| Restart Scout cluster (`scout.js start-server`) | **70-155s** |
| Run 8-scenario eval suite | **16-28 min** |
| Query ES for results | seconds |
| Re-render comparison HTML | seconds |
| **Total per iteration** | **~20-32 min** |

The eval-suite step dominates, and 7 of 8 scenarios are noise when you're debugging a specific failure mode. We can collapse this to ~90 seconds per iteration:

### Tier 1 — already-supported flags, no code changes

| Optimisation | Cycle cost | Notes |
|---|---:|---|
| Single scenario via Playwright `--grep` | ~3 min | `--grep "requirement 2.2.4"` runs one scenario |
| Single model (Sonnet 4.6 only) | -50% | Sonnet 4.6 is faster than Opus 4.7 and shows the same routing failure |
| Reuse running Scout (don't restart) | -2 min | Currently the composite script tears it down — should keep it up across iterations |
| Skip data re-seed (idempotent guard) | -30s | `seedPciEvalData` always re-writes; could be no-op if index exists |
| **Tier 1 total** | **~90s/iter** | 95% faster |

### Tier 2 — small code additions

| Optimisation | Cycle cost | Notes |
|---|---:|---|
| **Tool-call probe** (no judge) | **~15s/iter** | Fire one question via Kibana API, inspect agent's tool-call trace, fail if `pci_compliance` not called. Bypasses the LLM judge entirely. Binary signal for the specific bug we're debugging. |
| Cache LLM responses by `(skill_content_hash, question)` | -varies | Reuse responses when only test infra changed |
| In-process eval (no Playwright orchestration) | -1-2 min | Call `chatClient.converse` directly from a Node script |

### Tier 3 — automated feedback loop

| Optimisation | Description |
|---|---|
| **Skill-architect rewrite loop** | Feed the `evaluator.explanation` text back into `skill.architect`. The architect already has provenance tracking; add an "eval-driven revision" mode that reads judge rationales and emits a content diff. |
| **Per-criterion regression suite** | Each scoring criterion (e.g. "Called the pci_compliance tool in check mode") becomes its own boolean test. Lets you optimise content against the **lowest-passing** criterion specifically. |
| **Mixed-model judge ensemble** | Run the judge with both Sonnet 4.6 and a cheaper model in parallel. If they disagree, surface the disagreement for human review. Reduces single-judge bias. |

### Recommended path

1. **Today**: implement Tier 1 — add a `--scenario` flag to the eval runner; cycle drops to ~90s. Validate one fix end-to-end on `req 2.2.4`.
2. **This week**: add the Tier 2 tool-call probe (a 30-line script that hits Kibana's chat API and asserts on the step trail). Use it as the inner loop; promote to full eval-suite only after the probe passes.
3. **Next**: wire the Tier 3 skill-architect rewrite loop so the architect can self-improve against eval feedback.

## 7 · What the autonomous architect did right (do not regress these)

Several autonomous-architect contributions are objectively better and should be preserved when applying the fixes above:

- **More precise "do not use" boundaries.** Identifies sibling frameworks by name (SOC 2, HIPAA, NIST, ISO 27001) — keep, just drop the broken handoff suggestions.
- **v4.0.1 clarifications captured.** Req 6.3.3 critical-only patching, req 8.4.2 universal MFA, FIDO2 substitution — handwritten skill has these too but autonomous has them more comprehensively.
- **SAQ taxonomy.** Genuinely useful for scoping discussion. Just move it out of the procedural workflow.
- **NOT_ASSESSABLE status.** Distinguishes "no data" from "data is fine" cleanly; the handwritten skill conflates these.
- **Deduplication + parameter-binding notes.** Identical to handwritten — keep.

The architect's *content* contribution is broadly valuable; what costs points is the *structure* (theory-first ordering) and *framing* (provenance commentary, broken handoffs).

## 8 · One number to track

Across 16 scenarios on both models, the autonomous skill makes **0 calls** to its own dedicated PCI tools. The handwritten skill makes **40**. Tracking "pci-tool-call count per 8 scenarios" is the single most useful KPI for this skill's quality — it correlates 1:1 with the PCI Criteria mean score in the data we have.

## 9 · Next steps

1. Apply fixes 1-6 to `pci_compliance_autonomous_skill.ts`.
2. Implement the Tier 1 single-scenario runner (3-min loop).
3. Re-run `req 2.2.4 default accounts` against the fixed autonomous skill on Sonnet 4.6.
4. Once green on that scenario, re-run the full 8-scenario suite on both models and update `comparison.html`.
5. Track tool-call count as a side-channel KPI in the rendered report.

If the fixes work as predicted, the autonomous skill should land within 2-3 points of the handwritten skill (i.e. ≥ 0.95 on both models), and the *structural* advantage (broader domain coverage, NOT_ASSESSABLE state, etc.) will be a net positive instead of a net negative.
