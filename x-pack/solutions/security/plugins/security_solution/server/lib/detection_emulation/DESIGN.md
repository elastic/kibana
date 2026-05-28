# Detection Emulation v2: High-Fidelity Synthetic Log Generation

> **Status:** Draft · **Author:** Patryk Kopycinski · **Last updated:** 2026-05-28

## 1. Problem Statement

The current log-injection generator (`generator.ts`) stamps one ECS document per
payload using 12 hardcoded `TECHNIQUE_TEMPLATES`. This has three structural
limitations:

1. **Fixed technique coverage.** Only 12 MITRE ATT&CK techniques are supported.
   Adding a new one requires hand-authoring a template and a payload entry.
2. **No causal or temporal realism.** Every document in a scenario shares the
   same `@timestamp`. There are no prerequisite events (DNS before connection,
   auth before process creation, parent process before child). A single
   isolated event per technique is trivially distinguishable from real
   telemetry.
3. **No background noise.** Real environments produce thousands of benign events
   for every malicious one. Without noise the detection rule fires in a vacuum
   — there is nothing to hunt *through*, so the emulation doesn't test whether
   the rule is precise enough to surface signal above noise.

### Prior Art

| Tool | Owner | Approach | Key Insight We Borrow |
|------|-------|----------|----------------------|
| **EvidenceForge** | Cisco Talos (David Bianco) | Canonical `SecurityEvent` → 20+ format emitters; LLM designs scenario, deterministic engine generates | Separate LLM authoring from deterministic generation; causal prerequisite chains; background noise with red herrings |
| **Geneve** | Elastic (`elastic/geneve`) | Parses KQL/EQL rule query → generates minimum ECS docs that trigger it | Rule-query inversion eliminates hand-coded templates |
| **Splunk contentctl** | Splunk | Detection-as-code CI with containerised replay | Unit-test model: each rule ships with synthetic events that prove it fires |
| **pypanther** | Panther Labs | Python detection classes with inline `def tests()` returning synthetic dicts | Simplest "rule + expected events" contract |

### Design Principle

> **AI co-develops the story; a script generates the evidence.**
>
> LLMs excel at TTP research, attack narrative, and realistic command-line
> strings. They are terrible at maintaining PID consistency across 500
> cross-referenced documents. The generator must be deterministic.

All code lives inside `x-pack/solutions/security/plugins/security_solution/`.
No external services, no sidecar deployments, no Python processes.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Agent Builder Skill (LLM)                     │
│  • Receives rule + technique context                            │
│  • Designs scenario: host env, user roles, attack chain order   │
│  • Outputs structured EmulationScenario JSON                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               Deterministic Generation Pipeline                  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Rule Query       │  │ Causal Chain     │  │ Background    │ │
│  │ Inverter         │  │ Generator        │  │ Noise         │ │
│  │                  │  │                  │  │ Generator     │ │
│  │ Parse KQL/EQL →  │  │ Insert prereq   │  │               │ │
│  │ extract required │  │ events: auth,    │  │ N benign ECS  │ │
│  │ ECS fields →     │  │ DNS, parent      │  │ events per    │ │
│  │ generate matching│  │ process start    │  │ host role     │ │
│  │ documents        │  │                  │  │ + red herrings│ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬────────┘ │
│           │                     │                    │          │
│           └─────────────┬───────┘────────────────────┘          │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Document Assembler                           │   │
│  │  • Consistent PID tree across all events                  │   │
│  │  • Timestamp spread with jitter (Poisson intervals)       │   │
│  │  • Shared host/user/session context                       │   │
│  │  • Emulation metadata tagging                             │   │
│  └──────────────────────────────┬────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Executor → .kibana-security-emulation-logs-default-*           │
│  Detection Engine → rules fire → alerts                         │
│  Telemetry Collector → confidence score                         │
│  Quality Evaluator → post-hoc fidelity checks                   │
└─────────────────────────────────────────────────────────────────┘
```

### New Modules (all under `server/lib/detection_emulation/`)

| Module | File(s) | Purpose |
|--------|---------|---------|
| Rule Query Inverter | `log_injection/rule_query_inverter.ts` | Parses a detection rule's KQL/EQL query and extracts the field constraints needed to generate a matching ECS document. Uses Kibana's built-in `@kbn/es-query` utilities. |
| Causal Chain Generator | `log_injection/causal_chain.ts` | Given a target event, emits prerequisite ECS events with correct temporal ordering (e.g., DNS lookup → TCP connection → process start). Static causal graph. |
| Background Noise Generator | `log_injection/noise_generator.ts` | Generates benign ECS events appropriate to a host's role (workstation, server, DC). Includes configurable red herrings. |
| Document Assembler | `log_injection/document_assembler.ts` | Merges attack events, prerequisite events, and noise into a single timeline with consistent PIDs, timestamps, and session context. |
| Quality Evaluator | `quality_evaluator.ts` | Post-generation validation: schema compliance, temporal monotonicity, causal integrity, detection coverage. |
| Scenario Schema | `scenarios/scenario_schema.ts` | Zod schema for `EmulationScenario` — the structured contract between LLM authoring and deterministic generation. |

---

## 3. Detailed Component Design

### 3.1 Rule Query Inverter

**Goal:** Given any Elastic detection rule, automatically generate ECS documents
that satisfy its query — eliminating hand-coded technique templates.

**Approach:**

1. Read the rule's `query` string and `language` (`kuery` | `eql` | `esql`).
2. Parse into an AST using `@kbn/es-query` (for KQL) or the EQL parser already
   in `x-pack/solutions/security/plugins/security_solution`.
3. Walk the AST and extract field constraints:
   - `process.name: "powershell.exe"` → `{ "process.name": "powershell.exe" }`
   - `event.category: "process" and event.type: "start"` → merged object
   - `source.ip: *` → generate a plausible RFC 1918 address
   - Negations (`not`, `!=`) → avoid the excluded value
4. For unconstrained fields that the index template requires, generate
   realistic defaults from a field-type lookup table (IPs, hostnames, paths).
5. Overlay the emulation metadata (`event.module: 'emulation'`,
   `kibana.alert.emulation.*`).

**EQL sequences** (`sequence by host.id [process where ...] [file where ...]`):
parse each clause independently, generate one document per clause, link them by
the `by` key and order timestamps.

**Scope for Phase 1:** KQL rules only (~80% of prebuilt rules). EQL sequence
support in Phase 2.

**Fallback:** If the inverter cannot fully parse a query (complex nested
sub-queries, pipes), fall back to the existing `TECHNIQUE_TEMPLATES` for known
techniques and log a warning for coverage tracking.

```typescript
// rule_query_inverter.ts — public API sketch
export interface FieldConstraints {
  required: Record<string, string | string[] | number | boolean>;
  excluded: Record<string, string[]>;
  wildcards: Record<string, string>; // field → pattern
}

export function invertKqlQuery(query: string): FieldConstraints;
export function invertEqlQuery(query: string): FieldConstraints[];
export function generateDocFromConstraints(
  constraints: FieldConstraints,
  context: { hostId: string; hostName: string; userName: string; timestamp: string }
): EcsEmulationDocument;
```

### 3.2 Causal Chain Generator

**Goal:** For each attack event, automatically insert prerequisite events that
would exist in real telemetry, making the scenario causally coherent.

**Static causal graph** (no LLM needed):

```
network.connection
  ├── prereq: dns.query (if destination is a hostname)
  └── prereq: auth.logon (if crossing trust boundary)

process.start
  ├── prereq: process.start (parent process, if not already in timeline)
  └── prereq: auth.logon (if user context changes)

file.creation / file.deletion
  └── prereq: process.start (the process performing the I/O)

registry.change
  └── prereq: process.start (the process modifying the registry)
```

Each prerequisite is emitted with a realistic time offset *before* the target
event (e.g., DNS 50–200ms before connection, parent process 1–5s before child).

```typescript
// causal_chain.ts — public API sketch
export interface CausalEvent {
  doc: Partial<EcsEmulationDocument>;
  offsetMs: number; // negative = before target event
  causalType: 'dns_lookup' | 'auth_logon' | 'parent_process' | 'session_start';
}

export function expandCausalChain(
  targetEvent: EcsEmulationDocument
): CausalEvent[];
```

### 3.3 Background Noise Generator

**Goal:** Generate benign ECS events that surround the attack events, providing
realistic signal-to-noise ratios for detection testing.

**Host role profiles:**

| Role | Typical noise events |
|------|---------------------|
| `workstation` | Explorer.exe, browser, Office apps, Windows Update, OneDrive sync |
| `server` | Service polling, health checks, log rotation, backup agents |
| `domain_controller` | Kerberos TGT/TGS, LDAP queries, AD replication, DNS responses |
| `web_server` | HTTP access logs, TLS handshakes, app pool recycling |

**Noise-to-attack ratio:** Configurable, default 10:1 (10 benign events per
attack event). This is deliberately low for initial testing; EvidenceForge uses
ratios closer to 100:1 in realistic scenarios.

**Red herrings** (configurable, off by default in Phase 1):
- Admin running `whoami`, `ipconfig` (looks like recon but is routine)
- Backup service accessing `LSASS` memory (looks like credential dumping)
- Legitimate `schtasks` for Windows Update (looks like persistence)

```typescript
// noise_generator.ts — public API sketch
export interface NoiseConfig {
  hostRole: 'workstation' | 'server' | 'domain_controller' | 'web_server';
  ratio: number;        // benign events per attack event
  redHerrings: boolean; // include suspicious-but-benign events
  seed: number;         // deterministic randomness
}

export function generateNoise(
  config: NoiseConfig,
  attackEvents: EcsEmulationDocument[],
  timeWindow: { start: string; end: string }
): EcsEmulationDocument[];
```

### 3.4 Document Assembler & Temporal Model

**Goal:** Merge attack events, causal prerequisites, and noise into a single
chronologically ordered timeline with consistent identifiers.

**Responsibilities:**

1. **PID allocation.** In-memory counter starting at a realistic base (e.g.,
   4000). Every `process.start` event gets a unique PID. Child events reference
   their parent's PID via `process.parent.pid`. PIDs are never reused within a
   scenario.

2. **Timestamp spread.** Replace the current single-timestamp model with:
   - Base timestamp from the scenario (or `Date.now()`)
   - Each event offset by a Poisson-distributed interval (λ configurable,
     default ~500ms for attack events, ~2s for noise)
   - Jitter: ±10% uniform noise on each interval
   - Result: events are temporally ordered but irregularly spaced, like real
     telemetry

3. **Session consistency.** All events for a given user share:
   - `user.name`, `user.id`, `user.domain`
   - `host.id`, `host.name`, `host.os.type`
   - `process.entity_id` (if Elastic Defend format)

4. **Emulation tagging.** Every document carries `event.module: 'emulation'`
   and `kibana.alert.emulation.*` metadata so the telemetry collector can
   identify and measure the scenario.

```typescript
// document_assembler.ts — public API sketch
export interface AssembleInput {
  attackDocs: EcsEmulationDocument[];
  causalDocs: CausalEvent[];
  noiseDocs: EcsEmulationDocument[];
  baseTimestamp: string;
  seed: number;
}

export function assembleTimeline(input: AssembleInput): EcsEmulationDocument[];
```

### 3.5 Quality Evaluator

**Goal:** Post-generation validation that catches structural issues before
indexing. Inspired by EvidenceForge's 4-pillar scoring.

| Pillar | Checks |
|--------|--------|
| **Schema compliance** | All required ECS fields present; field types match ECS spec; no unknown top-level keys |
| **Temporal plausibility** | Timestamps are monotonically non-decreasing; gaps between events are within configured bounds; no future timestamps |
| **Causal integrity** | Every child `process.parent.pid` references a PID that exists earlier in the timeline; every network connection has a preceding DNS lookup (if hostname-based) |
| **Detection coverage** | At least one generated document should trigger the target rule (dry-run the query against the docs as an ES query DSL filter) |

Returns a `QualityReport` with per-pillar pass/fail and a list of violations.
Generation proceeds even on warnings; hard failures (e.g., missing required
fields) block indexing.

### 3.6 Scenario Schema

The structured contract between LLM-driven scenario authoring and deterministic
generation. The Agent Builder skill's LLM outputs this schema; the generator
consumes it without interpretation.

```typescript
// scenarios/scenario_schema.ts
import { z } from '@kbn/zod';

export const EmulationScenarioSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),

  environment: z.object({
    hosts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      os: z.enum(['windows', 'linux', 'macos']),
      role: z.enum(['workstation', 'server', 'domain_controller', 'web_server']),
    })),
    users: z.array(z.object({
      name: z.string(),
      domain: z.string().optional(),
      role: z.enum(['admin', 'standard', 'service_account']),
    })),
  }),

  attackChain: z.array(z.object({
    techniqueId: z.string(),           // MITRE ATT&CK ID
    name: z.string(),
    hostId: z.string(),                // references environment.hosts[].id
    userName: z.string(),              // references environment.users[].name
    ruleId: z.string().optional(),     // specific rule to validate against
    commandLine: z.string().optional(),// LLM-authored realistic command
    delayMs: z.number().optional(),    // time gap from previous step
  })),

  noiseConfig: z.object({
    ratio: z.number().default(10),
    redHerrings: z.boolean().default(false),
    seed: z.number().default(42),
  }).optional(),
});

export type EmulationScenario = z.infer<typeof EmulationScenarioSchema>;
```

---

## 4. Phased Delivery Plan

### Phase 1 — Foundation (next PR after #269019)

| Item | Effort | Impact |
|------|--------|--------|
| Timestamp spread + jitter in `generator.ts` | S | High — eliminates the identical-timestamp tell |
| Process tree consistency (PID allocation) | S | High — enables parent/child correlation |
| `causal_chain.ts` — prerequisite events for process, auth, DNS | M | High — transforms single-event scenarios into multi-event stories |
| `document_assembler.ts` — merge & sort | M | Required by above |
| Expand `EcsEmulationDocument` type with PID, entity_id, network fields | S | Prerequisite for all above |
| Update `index_template.ts` mappings for new fields | S | Required |

**Outcome:** Every emulation scenario produces a causally coherent, temporally
spread, PID-consistent multi-event story instead of a single flat document.

### Phase 2 — Rule-Awareness

| Item | Effort | Impact |
|------|--------|--------|
| `rule_query_inverter.ts` — KQL parser + constraint extraction | L | Transformative — any prebuilt rule works, not just 12 |
| Integration with `detection_emulation_skill.ts` | M | Skill auto-generates docs for whatever rule the user picks |
| `quality_evaluator.ts` — post-generation checks | M | Catches structural bugs before indexing |

**Outcome:** The hardcoded `TECHNIQUE_TEMPLATES` become a fallback, not the
primary path. Coverage jumps from 12 techniques to hundreds.

### Phase 3 — Realism

| Item | Effort | Impact |
|------|--------|--------|
| `noise_generator.ts` — role-based background events | M | Adds noise floor for realistic hunting practice |
| Red herring events | S | Tests rule precision, not just recall |
| `EmulationScenario` schema + LLM scenario authoring in the skill | L | Full separation of authoring and generation |
| EQL sequence support in inverter | L | Covers sequence-based rules (~15% of prebuilt) |

**Outcome:** Full EvidenceForge-grade fidelity for the log-injection mode,
entirely within Kibana.

### Phase 4 — Scenarios as Artifacts

| Item | Effort | Impact |
|------|--------|--------|
| Scenario library (built-in YAML/JSON scenarios in `scenarios/`) | M | Shareable, versioned, deterministic replays |
| Scenario import/export in the Agent Builder UI | M | Teams share validated scenarios |
| Ground truth document generation (like EvidenceForge's `GROUND_TRUTH.md`) | S | Enables scoring analyst performance against known answers |

---

## 5. What We Deliberately Do NOT Build

| Decision | Rationale |
|----------|-----------|
| **Multi-format emitters** (Sysmon XML, Zeek JSON, Snort, syslog) | We only need ECS for Elastic Security. EvidenceForge needs 20+ formats because it targets SOF-ELK and heterogeneous SIEMs. We don't. |
| **Network sensor placement modeling** | Valuable for training exercises but irrelevant for detection rule validation. All our events go through a single Elasticsearch index. |
| **Hawkes process timing model** | Over-engineered for our use case. Simple Poisson + jitter achieves "not obviously fake" without the mathematical complexity. Revisit if customers request training-grade fidelity. |
| **External geneve deployment** | We port the concept (query → constraints → doc) into TypeScript in-tree. No Python sidecar, no separate service. |
| **Real attack execution in this path** | The `real_execution` mode (via Caldera/Fleet) already exists. This design doc covers only log-injection improvements. |

---

## 6. Backward Compatibility

- The existing `generateDocs()` function in `generator.ts` remains the public
  API. Its signature does not change. Internally it delegates to the new
  assembler pipeline.
- The existing `TECHNIQUE_TEMPLATES` become the fallback for rules the query
  inverter cannot parse. They are never removed, only deprioritized.
- The existing `payloads.json` format is extended, not replaced. New fields
  (`ruleId`, `commandLine`, `delayMs`) are optional.
- The `EmulationScenario` schema is a superset of the current `GenerateDocsInput`.
  The skill can produce either; the generator accepts both.
- Index template changes are additive (new fields), never breaking.

---

## 7. Open Questions

1. **Should the quality evaluator run synchronously (blocking indexing) or
   async (post-indexing report)?** Recommendation: synchronous for hard
   failures, async for the full report.

2. **How many built-in noise profiles do we need for Phase 3?** Start with
   `workstation` and `server`; add DC and web server later based on demand.

3. **Should scenario files live in the plugin source or in a Kibana saved
   object?** Recommendation: plugin source for built-in scenarios, saved object
   for user-created scenarios.

4. **EQL sequence support priority.** ~15% of prebuilt rules use sequences.
   Defer to Phase 2 or accelerate if a key customer scenario requires it?

---

## 8. Reusing the Rule Preview Infrastructure

### What Rule Preview Actually Does

The existing rule preview route (`DETECTION_ENGINE_RULES_PREVIEW`, POST)
does **not** parse or analyze the rule's query. It runs the **real rule type
executor** (`createQueryAlertType()`, `createEqlAlertType()`, etc.) against
actual Elasticsearch data within a time window. Key mechanics:

- Wraps the rule executor with `createSecurityRuleTypeWrapper({ isPreview: true })`
- Uses a `previewRuleDataClient` that writes alerts to `.preview.alerts-*`
  instead of production alert indices
- Uses a stub alert factory (no alerting actions fire)
- Loops `invocationCount` times, advancing `startedAt` by the rule's
  `schedule.interval` each iteration
- 60-second timeout via `AbortController`
- Returns `{ previewId, logs, isAborted }` — the `previewId` can query
  preview alerts from `.preview.alerts-*`

### What We Can Reuse (and What We Can't)

| Component | Reusable? | How |
|-----------|-----------|-----|
| **Rule type executors** (query, eql, esql, threshold, new_terms, ml, indicator_match) | ✅ Yes | Run against our emulation index after doc injection |
| **`createSecurityRuleTypeWrapper`** with `isPreview: true` | ✅ Yes | Avoids writing to production alert indices |
| **`previewRuleDataClient`** | ✅ Yes | Already scoped to `.preview.alerts-*` |
| **Stub alert factory** | ✅ Yes | We just need to count alerts, not persist them |
| **Timeout / abort infrastructure** | ✅ Yes | Same 60s cap works for validation |
| **Query parsing / AST inversion** | ❌ No | Preview doesn't parse queries — it executes them. We still need the rule query inverter for doc generation. |
| **`wrapScopedClusterClient`** | ✅ Yes | Abort-aware ES client wrapper |

### Proposed Integration: `PreviewBasedValidator`

Instead of building a custom query evaluator for the "detection coverage"
pillar, we run the actual rule executor against the emulation index:

```typescript
// quality_evaluator.ts — detection coverage check

import { previewRulesRoute } from '../detection_engine/rule_preview';

async function validateDetectionCoverage(
  rule: RuleParams,
  emulationIndex: string,
  timeWindow: { start: string; end: string },
  deps: PreviewDeps
): Promise<{ alertCount: number; passed: boolean }> {
  // 1. Override the rule's index pattern to point at our emulation index
  const previewParams = {
    ...rule,
    index: [emulationIndex],
    timeframeEnd: timeWindow.end,
    invocationCount: 1,
  };

  // 2. Run the real rule executor via the preview infrastructure
  const { previewId, logs } = await executePreview(previewParams, deps);

  // 3. Count how many alerts fired
  const alertCount = await countPreviewAlerts(previewId, deps.esClient);

  return {
    alertCount,
    passed: alertCount > 0,
  };
}
```

**This gives us:**

1. **Exact-match validation.** We're running the *same code path* as
   production detection. If the preview fires, the real rule will fire.
2. **All rule types supported.** KQL, EQL, ES|QL, threshold, new terms,
   indicator match — we don't need to reimplement query evaluation.
3. **No custom query parser needed for validation.** The query inverter is
   still needed for *generating* documents, but for *validating* them we
   just run the rule.
4. **Sequence coverage for free.** EQL sequence rules work through the
   preview executor without us having to parse `sequence by` blocks for
   the validation step (we still need to parse them for doc generation).

### Impact on Phased Plan

This shifts the quality evaluator from Phase 2 to **Phase 1** — we can
validate detection coverage using the preview infrastructure immediately,
without waiting for the rule query inverter. The pipeline becomes:

```
Phase 1 (Foundation):
  Generate docs (templates + causal chain + temporal spread)
    → Index into emulation index
    → Run rule preview executor against emulation index  ← NEW
    → Immediate confidence: "did the rule fire? yes/no"
    → No more waiting for the detection engine's scheduled loop

Phase 2 (Rule-Awareness):
  Rule query inverter generates docs from any rule's query
    → Same preview-based validation
    → Coverage jumps from 12 techniques to hundreds
```

This also means we can **replace the current `telemetry_collector.ts`
polling approach** (which waits for the detection engine to run on its
schedule) with a synchronous preview-based check that returns results
in seconds, not minutes.

---

## 9. Implementation Status & Gap Analysis

> **Updated:** 2026-05-28 — reflects the current state of the branch.

### 9.1 What Has Been Built

All code resides under `server/lib/detection_emulation/`:

| Module | Status | Tests | Notes |
|--------|--------|-------|-------|
| **EQL Parser** (`log_injection/eql_parser/`) | ✅ Done | 28/28 pass | Recursive-descent parser (~250 lines). Handles `where`, `sequence by`, boolean ops, comparisons, wildcards, `in`, `not` |
| **KQL Query Inverter** (`log_injection/query_inverter.ts`) | ✅ Done | Passing | Uses `@kbn/es-query` `toElasticsearchQuery` + AST walking for field extraction |
|| **EQL Query Inverter** (in `query_inverter.ts`) | ✅ Done | Passing | Uses the custom EQL parser above; supports single-event and sequence rules |
|| **ES|QL Query Inverter** (`log_injection/esql_inverter.ts`) | ✅ Done | 26/26 pass | Uses `@elastic/esql` AST parser; extracts WHERE clause constraints (==, !=, <, <=, >, >=, LIKE, RLIKE, IN, IS NULL/NOT NULL); handles aggregating queries (inverts first WHERE only) |
| **Causal Chain Generator** (`log_injection/causal_chain.ts`) | ✅ Done | Passing | Static causal graph: DNS → connection, auth → process, parent → child |
| **Document Assembler** (`log_injection/document_assembler.ts`) | ✅ Done | Passing | PID allocation, timestamp spread (Poisson + jitter), session consistency, emulation tagging |
| **Noise Generator** (`log_injection/noise_generator.ts`) | ✅ Done | Passing | Role-based profiles (workstation/server), red herrings, configurable ratio |
| **Scenario Schema** (`log_injection/scenario_schema.ts`) | ✅ Done | Passing | Zod schema with explicit nested defaults (no `.default({})` recursion) |
| **Scenario Library** (`log_injection/scenario_library.ts`) | ✅ Done | — | Built-in scenarios for common techniques |
| **Quality Evaluator** (`log_injection/quality_evaluator.ts`) | ✅ Done | Passing | Post-injection evaluation: counts alerts in emulation index, scores coverage |
| **Executor** (`log_injection/executor.ts`) | ✅ Done | — | Bulk-indexes docs into `.kibana-security-emulation-logs-<spaceId>-*` |
| **Index Template** (`log_injection/index_template.ts`) | ✅ Done | — | `dynamic: 'runtime'` for flexible field mapping |
| **Scenario Orchestrator** (`log_injection/scenario_orchestrator.ts`) | ✅ Done | Passing | End-to-end pipeline: validate → invert → assemble → inject → evaluate → preview-validate |
| **`run_rule_executors.ts`** (under `rule_preview/api/preview_rules/`) | ✅ Done | — | Extracted from `route.ts`; standalone function for running rule preview executors outside the HTTP route |

**Test coverage:** 322 tests across 22 suites (1 skipped).

### 9.2 Extracted `runRuleExecutors`

The `runRuleExecutors` function was extracted from the monolithic `previewRulesRoute` handler in `route.ts` into a standalone, importable module (`run_rule_executors.ts`). This enables:

1. **Scenario orchestrator integration** — the orchestrator can run rule preview validation after doc injection without making an HTTP request to itself.
2. **Unit testability** — the executor can be tested in isolation with mock deps.
3. **Reuse in emulation API routes** — future emulation-specific routes can validate docs against rules directly.

The function accepts explicit dependencies (no closure captures) and returns `{ logs, isAborted }`.

### 9.3 Scenario Orchestrator ↔ Rule Preview Wiring

The orchestrator now accepts an optional `rulePreviewDeps` in its options:

```typescript
rulePreviewDeps?: {
  runRuleExecutors: (ruleType, params, deps) => Promise<{ logs, isAborted }>;
  executorDepsFactory: () => ExecutorDeps;
  createRuleTypeForParams: (ruleDef) => { alertType, params };
};
```

When provided, after document injection (Step 6) and evaluation (Step 7), the orchestrator runs **Step 8: Rule Preview Validation** — iterating over each target rule, running the real detection engine executor against the emulation index, and recording which rules would actually fire. Results appear in `OrchestratorResult.rulePreviewValidation`.

### 9.4 Remaining Gaps

| Gap | Priority | Effort | Notes |
|-----|----------|--------|-------|
| **API route for orchestrator** | High | M | Wire `executeScenario` into a POST endpoint (e.g., `_emulation/scenario/run`) with proper auth |
| **Skill integration** | High | M | The Agent Builder skill should call the orchestrator, not `generator.ts` directly |
| **Real `createRuleTypeForParams` factory** | Medium | S | Currently typed as `any`; needs a proper factory that maps rule definitions to alert types |
| **Scenario library expansion** | Low | M | More built-in scenarios covering T1059.*, T1070.*, T1053.* families |
| **Ground truth document** | Low | S | EvidenceForge-style `GROUND_TRUTH.md` per scenario for analyst scoring |
| **UI for scenario management** | Low | L | Import/export, run history, coverage dashboard |
