# Watch Officer POC — generalizing confidence scoring

Status: **plan / design** (branch `poc/watch-officer-confidence`, off the AD-confidence POC).
Driver: Project NotDaybreak (`elastic/project-daybreak`) **Watch Officer** (Tier‑2). Builds on the
AD confidence work in [PR #282069](https://github.com/elastic/kibana/pull/282069).

---

## 1. What we're building

A **Watch Officer** POC workflow that can be triggered by **detection alerts** *or* an **attack
discovery**, scores **confidence** for the alerts involved, and uses an **AI agent** to produce a
**verdict + a proposal of containment actions** (only when confidence is high enough), staged for
**human approval**.

To get there we must first **generalize** the confidence functionality — today it is coupled to
Attack Discovery — into a reusable unit that scores *any* bundle of alerts (with optional extra
context from an AD).

This maps directly onto Daybreak's Watch Officer: Tier‑2 *investigate / correlate / coordinate
response*, whose unit of output is a **Proposal** = evidence + expected impact + **confidence** +
required approval. There is already a stub to extend:
`src/platform/packages/shared/kbn-workflows/managed/definitions/pnd/watch_officer.yaml`
(manual trigger → `data.set` draft → `waitForInput` approve/modify/dismiss), plus a Tier‑1
`pnd/watch_floor.yaml` that already does trigger → `ai.agent`(confidence) → reasoning.

---

## 2. Current state — what's coupled to Attack Discovery

The confidence feature (`x-pack/solutions/security/plugins/discoveries/server/workflows/steps/confidence_step/`):

- **Step** `security.attack-discovery.confidence` — input `{ attack_discoveries[], anonymized_alerts, api_config, generation_uuid, replacements }`; scores **per discovery**; output = discoveries annotated with `confidence { score, band, rationale, factors[] }`.
- **Deterministic core** `compute_deterministic_factors.ts` — takes `{ discovery, rowsById }`, selects alert rows by `discovery.alert_ids`, computes 4 factors (evidence breadth, MITRE completeness, structural chain coherence, counter‑evidence). Uses `discovery.mitre_attack_tactics` as a tactic‑name fallback.
- **LLM synthesis** `score_with_llm.ts` — prompt built from `discovery.summary_markdown` + `details_markdown` + the deterministic factors.
- **Input form** — reads the AD `anonymized_alerts` CSV via `parse_anonymized_alerts_csv.ts`.

**Coupling points to remove:** AD namespace; `attack_discoveries[]` input shape; per‑discovery scoring; CSV‑only input; discovery‑markdown LLM prompt; discovery‑derived MITRE fallback.
**Already generic:** the `Confidence` schema `{ score, band, rationale, factors[] }` and the factor math itself (it only needs alert field‑maps + optional narrative).

### 2a. Revert on this branch (decision §8.3 — confidence is no longer stored on the AD doc)

Confidence moves out of AD generation, so on `poc/watch-officer-confidence` we **remove** the AD-doc coupling from the earlier confidence work (keep the reusable factor math + LLM synthesis, drop the AD persistence + in-pipeline step):

- Remove the `security.attack-discovery.confidence` step from `validate.yaml` and its registration (it no longer runs inside AD generation).
- Remove the optional `confidence` field from `AttackDiscoverySchema`, the persisted OpenAPI `AttackDiscovery`/`AttackDiscoveryAlert`, both ES field maps, the write/read transforms, and the doc-type workaround (i.e. revert the entire persistence surface added for the AD PR).
- Keep the pure core (`compute_deterministic_factors` + `score_with_llm` + `Confidence`) — that's what §3 extracts and generalizes.

Net: the AD alert stays as it was pre-confidence; the score is produced on demand by the Watch Officer's `security.confidence` step and lives on the **Proposal**, not the discovery.

---

## 3. Part A — Generalize the confidence core

### A1. Refactor the pure core to score an *evidence bundle*
- `computeConfidenceFactors({ alertRows: Array<Record<string,string>>, mitreTacticNamesFallback? })` — take the **already‑selected** alert field‑maps directly (drop `discovery` + `alert_ids`). AD callers select rows by `alert_ids`; alert callers pass all rows.
- `scoreConfidenceWithLlm({ deterministic, evidenceText, extraContext? })` — `evidenceText` = a narrative (AD markdown *or* a synthesized alert summary). Drop `discovery.*`.
- Keep `Confidence` unchanged.

### A2. Put the core somewhere reusable
The core lives in the `discoveries` **plugin** today; a second consumer (the generic step) needs it as
an importable module. Extract the pure helpers into the `@kbn/discoveries` **impl package**
(`x-pack/solutions/security/packages/kbn-discoveries/impl/...`) — already a dependency of the
plugin, importable by a new step. (Alternative: a small new `@kbn/security-confidence` package.)

### A3. Build a generic confidence **step** `security.confidence`
Registered by `security_solution` alongside the existing `security.*` steps
(`x-pack/solutions/security/plugins/security_solution/server/workflows/step_types/register_workflow_steps.ts`).
- **Input**: `{ alerts: <structured alert docs | anonymized CSV>, context?: { summary?, mitre_tactics? }, api_config }`.
- **Behavior**: normalize `alerts` → field‑maps (accept raw ECS `_source` from an `alert` trigger *and* the AD anonymized CSV), call the shared core, return **one** confidence for the **bundle**.
- **Output**: `{ confidence: { score, band, rationale, factors[] }, matched_alert_count }`.
- The AD step `security.attack-discovery.confidence` becomes a thin wrapper over the same core (or stays as‑is for its PR; the generic step is additive). **One core, two entry points.**

> The user asked for "a separate workflow **step** or **full workflow**." Recommendation: ship the
> generic **step** (simplest sub‑step for Watch Officer to call inline). Optionally wrap it in a
> `pnd/confidence.yaml` sub‑workflow invoked via `workflow.execute` if cross‑caller reuse‑by‑id is
> wanted (note: `workflow.execute` is `tech_preview`).

---

## 4. Part B — Two input adapters (inside the Watch Officer)

| Trigger | How alerts arrive | Adapter |
|---|---|---|
| **Detection alerts** (`type: alert`) | `event.alerts[]` — each has `_id`, `_index`, `@timestamp`, full ECS `_source` (`alert_analysis_workflow.yaml:196`) | Pass `event.alerts` straight to `security.confidence` (the step reads `event.category`, `threat.tactic.id`, … from `_source`). |
| **Attack discovery** (same `alert` trigger; branch by rule type — §5a) | The AD **is** the triggering alert doc; it carries its constituent `alert_ids[]` + markdown/mitre in `kibana.alert.attack_discovery.*` (persisted schema; `attack_discoveries[].alert_ids`, `elastic_assistant/.../persistence/types.ts:16-17`) | Iterate `alert_ids`, gather each alert (`security.renderAlertNarrative` / `security.buildAlertEntityGraph` by `(alertId, alertIndex)`, or an ES `terms` on `_id`), and pass the AD `summary/details_markdown` + `mitre` as `context` — satisfying "pass additional valuable information already gathered within the AD document." |

---

## 5. Part C — The Watch Officer workflow (extend `pnd/watch_officer.yaml`)

```yaml
triggers:
  - type: alert          # SINGLE trigger. An attack discovery is ALSO an alert document, so both
                         # detection alerts and AD alerts arrive here; branch on rule type below.
                         # (Whether AD alerts actually reach this trigger — see §5a, under verification.)

steps:
  - name: classify_trigger            # is the triggering alert an attack discovery?
    type: data.set
    with:
      is_attack_discovery: "${{ event.rule.ruleTypeId == 'attack-discovery' }}"   # scheduled-AD rule type; §5a

  - name: route                       # branch (use `if`/`else`; `switch` is schema-only/unused)
    type: if
    condition: "variables.is_attack_discovery: true"
    steps:                            # --- AD branch: the alert doc IS the discovery ---
      - name: build_ad_subject        # read the discovery's constituent alert_ids + markdown/mitre
        type: data.set                # from the AD alert doc (kibana.alert.attack_discovery.*),
        with: { subject: "${{ event.alerts }}" }   # then gather those alerts (§4) + pass AD context
      # + gather constituent alerts by alert_ids (security.buildAlertEntityGraph / renderAlertNarrative)
    else:                             # --- detection-alerts branch ---
      - name: build_alert_subject
        type: data.set
        with: { subject: "${{ event.alerts }}" }

  - name: score_confidence            # the generalized confidence step (Part A3), inline
    type: security.confidence
    with:
      alerts: "${{ variables.subject }}"
      context: "${{ variables.ad_context }}"     # only set on the AD branch
      api_config: "${{ variables.api_config }}"

  - name: run_agent                   # verdict + containment proposal, gated on confidence
    type: ai.agent
    agent-id: "{{ variables.agent_id }}"
    connector-id: "{{ variables.connector_id }}"
    with:
      message: |
        Confidence: {{ steps.score_confidence.output.confidence.score }} ({{ steps.score_confidence.output.confidence.band }})
        Rationale: {{ steps.score_confidence.output.confidence.rationale }}
        Evidence: {{ variables.subject | json }}
        Propose containment actions ONLY if confidence band is high and this is a true positive.
      attachments:
        - type: security.alert
          data: { alert: "{{ variables.minimal_alert | json:2 }}" }
      schema:
        type: object
        properties:
          verdict: { type: string, enum: [true_positive, false_positive, inconclusive] }
          confidence_score: { type: number, minimum: 0, maximum: 1 }
          rationale: { type: string }
          proposed_actions:
            type: array
            items:
              type: object
              properties:
                action: { type: string, enum: [isolate, kill-process, suspend-process, runscript] }
                target: { type: string }         # host.name / agent.id / process.entity_id
                justification: { type: string }
        required: [verdict, confidence_score, rationale, proposed_actions]

  - name: stage_proposal              # assemble the Daybreak Proposal object
    type: data.set
    with:
      proposal:
        verdict: "${{ steps.run_agent.output.structured_output.verdict }}"
        confidence: "${{ steps.score_confidence.output.confidence }}"
        proposed_actions: "${{ steps.run_agent.output.structured_output.proposed_actions }}"
        evidence: "${{ variables.subject }}"

  - name: await_approval              # reuse the existing HITL gate from the stub
    type: waitForInput
    with:
      message: "Approve the Watch Officer proposal?"
      schema: { type: object, properties: { decision: { type: string, enum: [approve, modify, dismiss] } }, required: [decision] }

  # POC stops here (propose-only). Productionization: on `approve`, call the endpoint action route
  # for each proposed_action via a `kibana.request` step (see §6).
```

**Containment vocabulary** (`common/endpoint/service/response_actions/constants.ts`): the enum above
is `ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS` = `isolate`, `kill-process`, `suspend-process`,
`runscript` (the auto‑eligible subset of `isolate`/`unisolate`/`kill-process`/`suspend-process`/
`running-processes`/`get-file`/`execute`/`upload`/`scan`/`runscript`/`cancel`/`memory-dump`).
Endpoint routes live at `/api/endpoint/action/*` (e.g. `/isolate`, `/kill_process`). **No endpoint
workflow step exists**, so the POC only *names* actions in the proposal; execution‑on‑approve would
be a `kibana.request` to those routes.

**Gating**: mirror the alert‑analysis auto‑close `if` (`alert_analysis_workflow.yaml:1216-1222`) —
only populate/stage `proposed_actions` when `confidence.band == high` (and verdict `true_positive`).

---

### 5a. Trigger feasibility — verified

The `type: alert` workflow trigger is **rule-action-scoped, not global**: an alert reaches a `type:
alert` workflow only when its producing rule has the `.workflows` system-action attached
(ConnectorAdapter `getWorkflowsConnectorAdapter`, `workflows_management/server/connectors/workflows/index.ts:233,237-297`;
detection rules are wired via `security_solution/.../alert_analysis_workflow/rule_attachments.ts`).
There is no global alert→workflow subscription.

Against that, the two AD paths differ:

| Path | Rule type id | Reaches `type: alert`? |
|---|---|---|
| **Scheduled AD** — a real alerting rule (`registerType(getAttackDiscoveryScheduleType)`, reports via `alertsClient`) | `attack-discovery` (`ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID`) | **Yes** — *if* the `.workflows` action is attached to the AD schedule rule(s). |
| **Ad-hoc AD** — `_generate` route bulk-writes directly (`create_attack_discovery_alerts/index.ts:145`), bypassing alerting | `attack_discovery_ad_hoc_rule_type_id` (sentinel) | **No** — never fires a `type: alert` workflow. |

So the single `alert` trigger covers **detection alerts + scheduled AD**, and we branch on
`event.rule.ruleTypeId` (`kibana.alert.rule.rule_type_id`): `attack-discovery` → AD branch,
`siem.*` → detection branch. Presence of `kibana.alert.attack_discovery.*` is an equivalent, stronger
signal. The AD alert carries its constituent detection-alert ids at
`kibana.alert.attack_discovery.alert_ids` (`alert_field_names.ts:8`), which the AD branch reads to
gather related alerts (§4).

**Two consequences:**
- **Attach the `.workflows` action** to the AD schedule rule (and to the detection rules you want
  watched) — mirror `rule_attachments.ts`. Without it, the trigger never fires.
- **Ad-hoc AD is out of scope** for the alert-trigger path. To watch ad-hoc discoveries you'd add a
  separate path (a custom event trigger fired from `_generate`, or invoke the workflow directly from
  that route). Fine for the POC — the Daybreak Watch model is driven by *persisted/scheduled*
  discoveries anyway.

**`manual` trigger: not needed** for scheduled AD (confirmed).

## 6. Registration, flags, productionization

- Register `security.confidence` in `security_solution` `register_workflow_steps.ts` (FF‑gated loader, like the AD steps). Per‑step **approval fixture** required (`approved_step_definitions/security.confidence.txt`).
- The Watch Officer workflow is already registered via `pnd/index.ts`; just extend the YAML (bump `version` for reconcile).
- **Feature flag**: reuse `securitySolution.attackDiscoveryConfidenceEnabled` or add a Watch‑Officer flag; keep default OFF.
- **Custom AD trigger** (future): register `attack-discovery.persisted` via `registerTriggerDefinition` (`@kbn/workflows-extensions`, `TRIGGERS.md`) + `emitEvent` on AD persist + approved‑trigger fixture. Until then the AD path uses the `manual` input.
- **Execute‑on‑approve** (future): `kibana.request` to `/api/endpoint/action/*`, with RBAC noted per action (`isolate`→`writeHostIsolation`, `kill-process`→`writeProcessOperations`, …).

---

## 7. Phased implementation

1. **Core**: extract + generalize the confidence helpers (§A1/A2); add the generic `security.confidence` step (§A3) scoring an alert bundle; unit tests (reuse `confidence_tiers.test.ts` recipes on the bundle contract).
2. **Watch Officer — alerts path**: extend `pnd/watch_officer.yaml` — `alert` trigger → `security.confidence` → `ai.agent` verdict+proposal → `await_approval`. Exercise with the seed alerts (`scripts/seed_confidence_scenarios`).
3. **Watch Officer — AD path**: add the AD branch (manual input) — gather `alert_ids` → confidence with AD `context`.
4. **Productionize**: custom `attack-discovery.persisted` trigger; execute‑on‑approve via endpoint routes; runtime config route (mirror alert‑analysis).

---

## 8. Decisions (locked 2026-08-03)

1. **Confidence unit** — generic **`security.confidence` step**, called inline.
2. **Core location** — `@kbn/discoveries` **impl package** (importable by the step).
3. **No confidence on the AD document** — confidence is **not** stored on the attack-discovery alert. It becomes a **separate step outside the AD generation workflow** (computed by the Watch Officer via `security.confidence`). → **Revert** the AD-doc persistence and the `validate.yaml` confidence step from the AD-confidence work (see §2a).
4. **Containment** — **propose-only** (no execution in the POC).
5. **Anonymization on the alerts path** — **skip** (read raw `_source`).
6. **Scoring granularity** — **one confidence per bundle**.
7. **Trigger** — a **single `alert` trigger**; branch on `event.rule.ruleTypeId` (`attack-discovery` → AD branch, `siem.*` → detection). **No `manual`/custom AD trigger needed.** Caveats (§5a): the `.workflows` action must be **attached** to the watched rules (incl. the AD schedule rule), and **ad-hoc AD** (`_generate`) bypasses alerting so it's out of scope for this trigger.

---

## 9. Risks / caveats

- `workflow.execute`/`executeAsync` are `tech_preview` (only relevant if the sub‑workflow path is chosen).
- No AD trigger exists yet → POC uses a `manual` payload.
- No endpoint‑isolation **workflow step** → containment is propose‑only or via `kibana.request`.
- The generic step must handle **two input shapes** (raw ECS alert docs and AD anonymized CSV).
- LLM synthesis is non‑deterministic; the deterministic factor floor keeps the score anchored.
- `switch` is schema‑supported but unused in shipped managed workflows — prefer `if`/`else`.
