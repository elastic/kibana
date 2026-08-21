<!--
  Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
  or more contributor license agreements. Licensed under the Elastic License
  2.0; you may not use this file except in compliance with the Elastic License
  2.0.
-->

# Reference: How to Write Evals for a Watch Capability

> **TL;DR** — When adding a Watch (a Daybreak capability) to Kibana, ship four
> layers of eval: **L0** routing/smoke, **L1** schema conformance, **L2** leaf
> quality, **L3** composite pipeline. This doc walks the threat-intelligence
> hunt suite as a concrete example.

---

## 1. Layer Map

| Layer | What it proves | Failure mode it catches | Example spec |
|-------|---------------|------------------------|--------------|
| **L0** | Skill routing — "does the default agent pick the right tool?" | Wrong skill activated, framework tooling gap, builtin-tool misroute | `routing_smoke.spec.ts` |
| **L1** | Schema conformance — "does the tool input contract hold?" | Breaking schema changes deployed silently, downstream parse failures | `schema_conformance.test.ts` (Jest) |
| **L2** | Leaf quality — "does the LLM produce correct/grounded output?" | Hallucinated techniques, invented IOCs, wrong severity scores, bad ES\|QL | `threat_intel_hunt.spec.ts` |
| **L3** | Composite pipeline — "does the orchestrator T1→T2→persist chain work?" | Tier 2 skipped when required, findings not persisted, inverse routing bug | `hunt_orchestrator_composite.spec.ts` |

**Notes**
- **L0/L1 are deterministic** — run on every PR, gate CI (cheap, fast).
- **L2/L3 are LLM-based** — run in Playwright + Scout, cost per-run, score per-model.
- We intentionally **skip Tier 3** (SSE precision on noisy SKI corpus) for this suite — it measures telemetry-to-indicator correlation, not skill correctness, and is covered elsewhere.

---

## 2. Conventions

### Tool IDs

Always use namespaced constants, never bare strings:

```typescript
// src/constants.ts
export const THREAT_INTEL_TOOL_IDS = {
  hunt_orchestrator: 'threat_intel.hunt_orchestrator',
  hunt_behavior: 'threat_intel.hunt_behavior',
} as const;
```

Hard-coding `'threat_intel.hunt_orchestrator'` in five spec files means a rename in the server breaks every test. Constants centralize the mapping.

### Fixtures

```typescript
// beforeAll: set the connector the tool reads from
base.beforeAll(async ({ kbnClient, connector, log }) => {
  await kbnClient.uiSettings.update({
    'genAi:defaultAIConnector': connector.id,
  });
});
```

The `hunt_behavior` route uses `genAi:defaultAIConnector` (no per-request override). Setting it in `beforeAll` makes the suite model-agnostic — the CI job swaps connectors, the suite tests the same skill.

### Assertions

| Signal | How to check | Example |
|--------|-------------|---------|
| Skill invoked | `toolIds.has(THREAT_INTEL_TOOL_IDS.hunt_behavior)` | `expect(skillInvoked).toBe(true)` |
| Correct tool | Compare against expected ID | `expect(tool_id).toBe('threat_intel.hunt_orchestrator')` |
| Args valid | Zod parse or min/max bounds | `expect(behaviorCount).toBeGreaterThanOrEqual(1)` |
| Technique coverage | Substring match in LLM message | `messageLower.includes(tid.toLowerCase())` |
| Persistence | ES search on findings index | `esClient.search({ index: THREAT_INTEL_FINDINGS_INDEX, ... })` |

---

## 3. file layout

```
kbn-evals-suite-security-threat-intel-hunt/
├── evals/
│   ├── routing_smoke.spec.ts           # L0 — 1 test, deterministic
│   ├── schema_conformance.test.ts      # L1 — 12 assertions, Zod (Jest)
│   ├── threat_intel_hunt.spec.ts       # L2 — 8 examples, leaf quality
│   └── hunt_orchestrator_composite.spec.ts  # L3 — 2 scenarios, pipeline
├── src/
│   ├── constants.ts                    # Tool IDs, index names
│   ├── dataset.ts                      # 8 labeled threat reports
│   ├── evaluate.ts                     # Playwright fixture extensions
│   ├── evaluate_dataset.ts             # Dataset runner for L2
│   ├── hunt_behavior_client.ts         # HTTP client (type-check only)
│   ├── types.ts                        # Shared types
│   └── evaluators/
│       └── index.ts                    # evaluator hooks
├── playwright.config.ts                # Suite config (15m timeout, 2 retries)
├── jest.config.js                      # L1 unit-test config
├── package.json                        # `@kbn/evals` + `@kbn/zod/v4` deps
└── tsconfig.json                       # References `@kbn/evals`
```

**Key rule**: the L1 schema tests live in `src/evaluators/schema_conformance.test.ts` (Jest), NOT under `evals/` (Playwright). This keeps deterministic tests fast and separate from LLM-based Playwright suites.

---

## 4. checklist (copy into PR description)

- [ ] L0: routing smoke passes (`npx jest src/evaluators/routing_smoke.spec.ts` or Playwright)
- [ ] L1: schema conformance passes (`yarn test:jest` or `npx jest src/evaluators/schema_conformance.test.ts`)
- [ ] L2: all dataset examples run (`evals start --suite <suite> --model <model>`)
- [ ] L3: composite pipeline runs end-to-end (T1 hits, T2 delegates, findings persisted)
- [ ] Tool IDs use constants from `src/constants.ts` (no bare strings)
- [ ] `beforeAll` sets `genAi:defaultAIConnector` when the tool needs it
- [ ] Playwright `timeout` + `retries` configured in `playwright.config.ts`
- [ ] CI registration added in `.buildkite/pipelines/evals/evals.suites.json`
- [ ] Package added to `tsconfig.base.json` path mappings
- [ ] Node version matches Kibana `.nvmrc` (v24.18.0) — NOT system default v22

---

## 5. common gotchas

### "TypeScript: No errors found" but exit code 1
`npx tsc --noEmit <file>` returns exit code 1 with a TS5112 CLI warning ("not in tsconfig"). This is **informational** — no actual type errors. Pass `--pretty false` to suppress the warning.

### `@kbn/evals` vs `@kbn/evals-lib`
**Do not use `@kbn/evals-lib`** — it is a legacy internal package with stale exports (`conversationClient`, `esClient`). Import from `@kbn/evals` instead. The `evaluate.ts` Playwright fixture provides `agentBuilderClient` and `esClient`.

### `ToolingLog` import missing
If `ToolingLog` isn't available in the suite's dependency graph, type the param as `log: any` or import from `@kbn/tooling-log`. Prefer `any` for test-only code over adding a heavy dep.

### Node version mismatch
Kibana requires **v24.18.0**. The pre-push hook runs eslint and fails on v22. Use `nvm use` before `node scripts/evals ...`.

### Read verification failure (`evals start` hangs)
The `read_verify` step requires seeded ES data. Run `evals start` from a worktree with the Scout server already booted (`node scripts/evals ensure-eval-stack` or use a capsule). Alternatively, skip the server step with `--skip-server` if you manage the stack manually.

---

## 6. model selection

| Model | Use case | Expected L2 pass rate |
|-------|----------|----------------------|
| `eis-anthropic-claude-4-5-haiku` | Fast iteration, CI smoke | ~60-70% |
| `eis-anthropic-claude-5-sonnet` | Quality gate, PR approval | ~80-85% |

Run Haiku first to catch wiring issues (cheap, fast), then Sonnet for the quality scorecard.

---

## 7. where this suite ships

- **Local**: `~/Projects/kibana.worktrees/pr-278905` on branch `daybreak/hunt-eval-conformance`
- **CI**: registered in `.buildkite/pipelines/evals/evals.suites.json` as `security-threat-intel-hunt`
- **Golden traces**: `traces-generic.otel` index on the golden ES cluster (required for `Skill Invoked`/`Trajectory` evaluator evidence)

---

## Appendix: L3 composite spec decision tree

When writing an orchestrator-level test, ask:

1. **Routing**: does the default agent invoke the orchestrator tool?
2. **Tier 1**: does the orchestrator call Tier 1 and get hits/misses?
3. **Tier 2 gate**: is Tier 2 called *only when appropriate*? (not on miss, not when `tier2_when: 'never'`)
4. **Findings**: does the LLM response mention the expected techniques?
5. **Persistence**: when Tier 2 runs, do docs land in the findings index?

If all five are true, the pipeline is healthy. If #1 fails, fix routing. If #3 fails, fix orchestrator logic. If #5 fails, fix persistence service or index mapping.
