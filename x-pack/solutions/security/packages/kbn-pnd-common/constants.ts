/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import type { RecommendedAction } from './impl/schemas';

export const PND_FEATURE_ID = 'pnd' as const;
export const PND_PLUGIN_NAME = 'AlertZero' as const;
export const PND_APP_ID = 'pnd' as const;
export const PND_APP_PATH = '/app/pnd' as const;

export const PND_INTERNAL_URL = '/internal/pnd' as const;

export const PND_WATCHES_URL = `${PND_INTERNAL_URL}/watches` as const;
export const PND_WATCH_URL_TEMPLATE = `${PND_WATCHES_URL}/{watchId}` as const;

export const buildWatchUrl = (watchId: string) =>
  `${PND_WATCHES_URL}/${encodeURIComponent(watchId)}`;

/** Global worker / skill catalogs — shared across watches. */
export const PND_WORKERS_URL = `${PND_INTERNAL_URL}/workers` as const;
export const PND_SKILLS_URL = `${PND_INTERNAL_URL}/skills` as const;

export const PND_WORKER_URL_TEMPLATE = `${PND_WORKERS_URL}/{workerId}` as const;
export const PND_SKILL_URL_TEMPLATE = `${PND_SKILLS_URL}/{skillId}` as const;

export const buildWorkerUrl = (workerId: string) =>
  `${PND_WORKERS_URL}/${encodeURIComponent(workerId)}`;

export const buildSkillUrl = (skillId: string) =>
  `${PND_SKILLS_URL}/${encodeURIComponent(skillId)}`;

/**
 * The `/internal/pnd/investigations*` paths, restored verbatim from upstream (register #45).
 *
 * Epic 2 deleted them because the three routes they addressed served `MOCK_INVESTIGATIONS`
 * fixtures. [#284440](https://github.com/elastic/kibana/pull/284440) then built a whole
 * conversation-queue surface on top of them, so removing them again would break shipped code that
 * imports these names. They are back at upstream's exact spelling — **their addressing** — while
 * `kibana-phf4.29` replaces the mock internals behind `.../{id}/proposals` with the real parked-gate
 * projection that `PND_PROPOSALS_URL` already serves.
 *
 * Until then the branch deliberately carries **two** proposal read paths. That is bounded, not the
 * shipping state; see register #45.
 */
export const PND_INVESTIGATIONS_URL = `${PND_INTERNAL_URL}/investigations` as const;
export const PND_INVESTIGATION_URL_TEMPLATE = `${PND_INVESTIGATIONS_URL}/{id}` as const;

export const buildInvestigationUrl = (id: string) =>
  `${PND_INVESTIGATIONS_URL}/${encodeURIComponent(id)}`;

/**
 * Shared thin AlertZero agent for all Worker `ai.agent` steps.
 * Can expand this to multiple scoped thin agents in the future if needed.
 * Prefer avoiding 1-1 correlation between Kibana managed agent and AZ Worker
 */
export const ALERTZERO_THIN_AGENT_ID = 'alertzero-thin-agent' as const;

export const PND_INVESTIGATION_PROPOSALS_URL_TEMPLATE =
  `${PND_INVESTIGATIONS_URL}/{id}/proposals` as const;

export const buildInvestigationProposalsUrl = (id: string) =>
  `${PND_INVESTIGATIONS_URL}/${encodeURIComponent(id)}/proposals`;

/**
 * Internal route paths for the PND thin slice (epic kibana-idjb). The orchestrator
 * YAMLs call these via `kibana.request`, and Epic 2's UI calls them from the browser.
 * `{param}`-style templates match the server-side path registration; the `build*`
 * helpers are the client-safe, `encodeURIComponent`-ed builders.
 */
export const PND_AUTONOMY_URL = `${PND_INTERNAL_URL}/autonomy` as const;

export const PND_CONVERSATIONS_URL = `${PND_INTERNAL_URL}/conversations` as const;
export const PND_CONVERSATIONS_DERIVE_URL = `${PND_CONVERSATIONS_URL}/_derive` as const;

/**
 * The one single-conversation route (epic kibana-z7xi `.8`).
 *
 * It is **S11**-guarded: it requires `correlationId` — on the query, regardless of HTTP
 * method — and asserts the addressed `conversationId` is a member of the set derived from that
 * alert id, so PND can never become a generic Agent Builder CRUD proxy. The builder below does not
 * append it; the caller adds it, because a query string belongs to the caller's fetch options
 * rather than to the path.
 *
 * There is deliberately no bare `/{conversationId}` template and no `_rename` template. `GET`,
 * `DELETE` and `_rename` shipped in epic kibana-z7xi and were retired here (register `#23`,
 * ADR-016) with nothing ever having called them: a watch renames its own thread by calling **Agent
 * Builder's** `_rename`, not ours, and Agent Builder's `access: 'owner'` check means our `_rename`
 * and `DELETE` would 404 for the analyst who can read a workflow-created thread anyway (D9). Adding
 * either template back is adding a route, so it wants a decision rather than a constant.
 */
export const PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE =
  `${PND_CONVERSATIONS_URL}/{conversationId}/attachments` as const;

export const buildConversationAttachmentsUrl = (conversationId: string) =>
  `${PND_CONVERSATIONS_URL}/${encodeURIComponent(conversationId)}/attachments`;

/**
 * Thread materialisation (D5). Deliberately rooted at `/threads` rather than under
 * `/conversations`, because it is addressed by `(correlationId, gateId)` — the id it
 * returns is *derived*, never supplied — while every route above addresses a conversation id
 * directly. The Watch Floor and the Post-Incident Watch call it from a `kibana.request` step.
 */
export const PND_THREADS_URL = `${PND_INTERNAL_URL}/threads` as const;
export const PND_THREADS_ENSURE_URL = `${PND_THREADS_URL}/_ensure` as const;

/**
 * Coverage-gap emit for terminals that never park a HITL gate — the Floor's
 * `not_an_incident` branch. HITL terminals emit from `_respond` instead.
 *
 * Rooted at `/signals` rather than under `/proposals`: there is no parked gate to
 * address, and the body is `{ correlationId, gapDescription, sourceRunId }` — the
 * same mapping `_derive` already does from the producer alert id.
 */
export const PND_SIGNALS_URL = `${PND_INTERNAL_URL}/signals` as const;
export const PND_DETECTION_CHANGE_SIGNAL_EMIT_URL = `${PND_SIGNALS_URL}/_detection_change` as const;

export const PND_PROPOSALS_URL = `${PND_INTERNAL_URL}/proposals` as const;
/**
 * The answered gates, in the same grouped shape as the queue.
 *
 * A literal segment rather than a `?status=` on the queue: the two reads scan different execution
 * statuses and cache separately, and a shared key would make the queue's own cache depend on which
 * tab was opened last.
 */
export const PND_PROPOSALS_HISTORY_URL = `${PND_PROPOSALS_URL}/history` as const;
/**
 * The 24h hourly sparkline series behind the KPI tiles (epic kibana-1fdi, plan §4.2).
 *
 * A sub-resource rather than an `_action`: it reads a derived series off the proposals collection
 * the way `history` reads the answered gates, while `_auto_respond` and `_respond` *do* something. It is
 * also a separate route from the queue rather than a widening of it, because the two are different
 * metrics — gates opened per hour versus gates still awaiting action — and they cache separately.
 */
export const PND_PROPOSALS_ACTIVITY_URL = `${PND_PROPOSALS_URL}/activity` as const;
export const PND_PROPOSALS_AUTO_RESPOND_URL = `${PND_PROPOSALS_URL}/_auto_respond` as const;
export const PND_PROPOSAL_RESPOND_URL_TEMPLATE =
  `${PND_PROPOSALS_URL}/{sourceId}/_respond` as const;

export const buildProposalRespondUrl = (sourceId: string) =>
  `${PND_PROPOSALS_URL}/${encodeURIComponent(sourceId)}/_respond`;

export const PND_RUNS_URL = `${PND_INTERNAL_URL}/runs` as const;

export const PND_EXECUTIONS_URL = `${PND_INTERNAL_URL}/executions` as const;
export const PND_EXECUTION_URL_TEMPLATE = `${PND_EXECUTIONS_URL}/{correlationId}` as const;

export const buildExecutionUrl = (correlationId: string) =>
  `${PND_EXECUTIONS_URL}/${encodeURIComponent(correlationId)}`;

/**
 * The one shared derivation behind both the blast radius chips and the risk score badge (epic
 * kibana-1fdi, plan §4.1, decision D10). Addressed by a repeated `correlationIds` query
 * parameter rather than a path segment, so there is no `build*` helper: every builder in this file
 * exists to encode a *path* parameter, and a query string belongs to the caller's fetch options.
 *
 * Rooted at `/discovery-context` rather than under `/executions`, which is already addressed by a
 * single `{correlationId}` — this route is deliberately a batch read, because the page
 * enriches every discovery its visible proposals reference in one round trip.
 */
export const PND_DISCOVERY_CONTEXT_URL = `${PND_INTERNAL_URL}/discovery-context` as const;

/**
 * Cap on `correlationIds`, and the **actual boundary** on that input — the generated
 * codec cannot carry it.
 *
 * `@kbn/openapi-generator` renders a bounded query array as `ArrayFromString(items).max(n)`, but
 * `ArrayFromString` returns a `z.preprocess` pipe, which has no `.max`, so a `maxItems` in the
 * OpenAPI produces a codec that throws `.max is not a function` on the first parse.
 * `kbn-inbox-common` hit the same wall (`list_history_route.schema.yaml`) and resolved it the same
 * way: bound each item in the schema, cap the count in the route.
 *
 * So the route must reject a longer list with a 400 before it queries. Each id becomes an `ids`
 * filter clause inside one `filters` aggregation over the alerts index, which is exactly the
 * unbounded-input DoS shape — and the enrichment is per page load, so 200 is far above what the
 * queue can put on screen.
 */
export const PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS = 200 as const;

export const PND_TUNING_URL = `${PND_INTERNAL_URL}/tuning` as const;
export const PND_TUNING_APPLY_URL_TEMPLATE = `${PND_TUNING_URL}/{proposalId}/_apply` as const;

export const buildTuningApplyUrl = (proposalId: string) =>
  `${PND_TUNING_URL}/${encodeURIComponent(proposalId)}/_apply`;

/**
 * The rules a tuning draft may choose among, projected from the detection alerts behind one Attack
 * Discovery (register `#24`).
 *
 * It exists because `draft_tuning` runs with `NO_TOOLS`: asked to name the rule it is tuning, the
 * model either recalls a prebuilt `rule_id` from training data — which is not the saved-object id
 * `_apply` needs, so `_apply` 404s — or answers `"UNKNOWN"`. Handing it the real rules turns a recall
 * into a choice, and makes `TuningApprovalDialog`'s editable rule-id field a correction rather than a
 * requirement on every run.
 *
 * A dedicated route rather than more of `_derive`: a rule-lookup failure must not take the agent id
 * down with it. `_derive`'s "agent existence and agent-id availability degrade together" property
 * (ADR-011) is load-bearing, so this reads through its own step with its own
 * `on-failure: { continue: true }`. Folding the rule terms into `/discovery-context`'s existing
 * aggregation was cheaper and was rejected: it puts a tuning concern on the Brief's blast-radius
 * path.
 *
 * Addressed by an `correlationId` query parameter rather than a path segment, so there is
 * no `build*` helper — every builder in this file encodes a *path* parameter, and a query string
 * belongs to the caller's fetch options.
 */
export const PND_TUNING_CANDIDATE_RULES_URL = `${PND_TUNING_URL}/candidate-rules` as const;

/**
 * Cap on how many distinct detection rules one discovery can contribute, and therefore both the
 * `terms` size of the aggregation that finds them and the `maxItems` on the response's `rules`.
 *
 * Each candidate costs one scoped read of the detection-engine rules API, so the cap is what keeps
 * a single request from fanning out into an unbounded number of self-calls. 20 is far above what a
 * tuning decision can use: the drafting step must choose *one* rule, and a discovery correlating
 * more than a handful of rules is evidence that the discovery is broad, not that the model needs a
 * longer menu.
 */
export const PND_TUNING_CANDIDATE_RULES_MAX = 20 as const;

/**
 * Bound on a candidate rule's `query`, matching the `note` bound `PndTuningChange` already carries.
 *
 * A query longer than this is projected **without** its `query` rather than truncated: the drafting
 * step diffs the current query against the one it proposes, so a silently clipped value would have
 * it propose a change against text the rule does not hold. An absent `query` makes the step decline
 * to propose one at all, which is the honest degradation.
 */
export const PND_CANDIDATE_RULE_MAX_QUERY_LENGTH = 20000 as const;

/**
 * Bound on a candidate rule's `index` patterns. Unlike `query`, this list is *capped* rather than
 * dropped when it is longer: the index patterns are context the model reads, not text it edits, so a
 * shortened list costs accuracy in the prompt while a shortened query would corrupt the diff.
 */
export const PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS = 100 as const;

/**
 * The only detection-rule fields a PND tuning proposal may patch. Read by all three
 * enforcement layers: `draft_tuning`'s output schema, `apply_tuning_route.schema.yaml`, and
 * `_apply`'s server-side allow-list (which is the actual boundary — it returns `400` for any
 * field outside this set, including one a schema might later widen by accident).
 *
 * Verified against the detection engine rather than assumed. The first three are exactly
 * `READ_AUTH_EDIT_FIELDS` minus `rule_source` and `exceptions_list`
 * (`security_solution/common/api/detection_engine/rule_management/crud/update_rule/update_rule_with_read_privileges.ts`)
 * — the field set the rules API itself treats as editable without full rules-write. Each stays
 * behind its own granular privilege, and `validateFieldWritePermissions`
 * (`detection_rules_client/utils.ts:58`) throws a `403` naming the offending field:
 * `enabled` → `canEnableDisableRules`, `investigation_fields` → `canEditCustomHighlightedFields`,
 * `note` → `canEditInvestigationGuides`.
 *
 * `query` is **not** in that platform set, so patching it needs full rules-write. That is not an
 * escalation: `_apply` is gated on `RULES_API_ALL` — the privilege the underlying detection-engine
 * PATCH requires — so a caller who cannot rewrite a query gets a route-level `403` before any of
 * this is read. It is in the set because the review flow it was waiting on now exists: the watch
 * backtests the current and the proposed query over one shared window and the approval surfaces
 * render the diff beside both counts, so a human approves a *measured* change rather than a
 * plausible sentence. Its one precondition — a `query` patch only means anything on a rule whose
 * `type` is `query` — is enforced where the rule is knowable, in `_apply`, which re-fetches the
 * rule and returns the same field-naming `400` for any other rule type.
 *
 * `exceptions_list` is in that platform set but is deliberately **excluded** here, for a reason of
 * its own that the review flow does not address: a patch *replaces* the array rather than merging
 * it (`mergers/apply_rule_patch.ts:114`, `rulePatch.exceptions_list ?? existingRule.exceptions_list`),
 * so an LLM-authored value silently detaches every exception list already attached to the rule —
 * and adding an exception *item* goes through a different API this thin slice does not call.
 *
 * Alert suppression and `threshold` stay out because they change how alerts de-duplicate and
 * group rather than which documents match, so an alert count measured either side of the change
 * does not describe what the change did. There is nothing to review against yet.
 */
export const PND_TUNABLE_RULE_FIELDS = [
  'enabled',
  'investigation_fields',
  'note',
  'query',
] as const;

export type PndTunableRuleField = (typeof PND_TUNABLE_RULE_FIELDS)[number];

/**
 * Workflow trigger ids as PND sees them. `security.attackDiscoveryCreated` is
 * registered + emitted by `discoveries` and stays generic (it knows nothing about
 * PND); `pnd.incidentClosed` is registered + emitted by the PND server on containment.
 */
export const SECURITY_ATTACK_DISCOVERY_CREATED_TRIGGER_ID =
  'security.attackDiscoveryCreated' as const;
export const PND_INCIDENT_CLOSED_TRIGGER_ID = 'pnd.incidentClosed' as const;

/**
 * The Detection Change Signal (DCS): *"there is a coverage gap here"*.
 *
 * `security.*` rather than `pnd.*`, and it lives in this shared package rather than in the `pnd`
 * plugin, because Dark Watch, Watch Officer and Deep Watch must be able to produce one without
 * depending on PND — the same rule that keeps `security.attackDiscoveryCreated` ignorant of its
 * consumers.
 *
 * Deliberately **not** the same signal as {@link PND_INCIDENT_CLOSED_TRIGGER_ID}: "an incident
 * closed" is a lifecycle fact (P3 / D14), while "coverage is missing" is a *claim*. They were only
 * ever one signal by accident, and keeping them apart is what lets the DCS carry a gap description
 * without the lifecycle signal inheriting one.
 */
export const PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID = 'security.detectionChangeSignal' as const;

/**
 * The kinds of evidence a Detection Change Signal may reference.
 *
 * A **generic kinded ref**, never an Attack-Discovery-shaped field. This is the one part of the
 * envelope that cannot be widened additively later: an optional field can always be added, but a
 * field's *shape* cannot be changed without breaking every consumer. Dark Watch's evidence is hunt
 * findings with no Attack Discovery anywhere in its path, so an `correlationId` here would
 * make Dark Watch adoption a breaking change to a schema shipped as cross-watch.
 *
 * The containment emitter populates `attack_discovery` and `conversation`; `alert` and `hunt_report`
 * are declared and unexercised in this slice, on purpose.
 */
export const PND_DETECTION_CHANGE_SIGNAL_EVIDENCE_KINDS = [
  'attack_discovery',
  'conversation',
  'alert',
  'hunt_report',
] as const;

export type PndDetectionChangeSignalEvidenceKind =
  (typeof PND_DETECTION_CHANGE_SIGNAL_EVIDENCE_KINDS)[number];

/**
 * Bound on every id-shaped string in the signal (`sourceWatchId`, `sourceRunId`, `spaceId`,
 * `ruleRef`, and each `evidenceRefs[].id`) — the same 1024 the two shipped trigger schemas use.
 */
export const PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH = 1024 as const;

/**
 * Bound on a single ATT&CK label — one `tactics` member, or `technique`.
 *
 * Generous for a value that is normally either a short name (`Privilege Escalation`) or an id
 * (`T1068`), because producers other than Attack Discovery may supply the fully-qualified form.
 */
export const PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH = 256 as const;

/**
 * Bound on how many tactics one signal may claim. There are 14 enterprise ATT&CK tactics, so a
 * signal at this cap is already claiming the whole matrix.
 */
export const PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS = 20 as const;

/**
 * Bounds on `dataSources` — the data-source requirements a Rule Creation lane reads. Members are
 * index patterns or integration names, hence the same 1024 an id gets.
 */
export const PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES = 50 as const;
export const PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCE_LENGTH = 1024 as const;

/**
 * Bound on `gapDescription`, deliberately **identical** to the `rationale` bound on
 * [`RespondToProposal`](impl/schemas/proposals/respond_to_proposal_route.schema.yaml) (`maxLength:
 * 2000`, `format: nonempty`).
 *
 * That equality is the whole argument that security finding S6 is not widened by this signal:
 * `gapDescription` is derived from a HITL `rationale` or the investigation worker's rationale,
 * both of which are already persisted in the workflows execution store, and the emit helper
 * clips to this bound. A coverage claim that said more than the store already held would be
 * a new disclosure.
 */
export const PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH = 2000 as const;

/**
 * Bound on `evidenceRefs`. At least one ref is required: a coverage claim nobody can trace back to
 * an artifact is not reviewable. The Floor emitter always holds at least the Attack Discovery
 * alert id and one derived conversation (investigation or incident, whichever exists).
 */
export const PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS = 50 as const;

/**
 * Bound on `recurrenceCount` — how many times the producer observed the pattern in its window.
 *
 * Bounded rather than free because the value is rendered in the UI and interpolated into a drafting
 * prompt, so an absurd count costs prompt budget and reads as authoritative. Counts above this are
 * evidence of a broken producer, not of a noisier rule.
 */
export const PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT = 100_000 as const;

/**
 * Per-watch, space-scoped uiSettings key for the persisted autonomy level. PND
 * registers one key per system watch (`readonly: true`, so it stays out of the
 * generic Advanced Settings editor) and writes it server-side behind the
 * autonomy privilege (uiSettings writes otherwise require `manage_advanced_settings`).
 *
 * The stored value is a {@link WATCH_AUTONOMY_LEVELS} member, not an ordinal — the same
 * `WatchAutonomyLevel` the settings contract carries, so there is one scale on the wire, in
 * uiSettings, and on screen.
 */
export const PND_AUTONOMY_UI_SETTING_PREFIX = 'pnd:autonomy:' as const;

export const buildWatchAutonomyUiSettingKey = (watchId: string) =>
  `${PND_AUTONOMY_UI_SETTING_PREFIX}${watchId}`;

/**
 * Dedicated PND sub-feature privilege that gates writing autonomy (`PUT /autonomy`)
 * and auto-responding to pending gates (`_auto_respond`) — grantable independently of
 * `pnd all`. The low-privilege read path (`GET /autonomy`) does not require it.
 */
export const PND_AUTONOMY_SUB_FEATURE_ID = 'pndManageAutonomy' as const;
export const PND_MANAGE_AUTONOMY_PRIVILEGE_ID = 'pnd_manage_autonomy' as const;

/**
 * Prefix of the rationale `_auto_respond` stamps on a gate it auto-accepts, completed
 * by the autonomy level and origin: `Auto-accepted by PND autonomy at level supervised (dial)`.
 *
 * Shared rather than duplicated because it is load-bearing in **two** directions (D12).
 * `_auto_respond` writes it, and the Brief's "Answered by" derivation reads it — an
 * auto-responded gate is resumed through exactly the same `resumeWorkflowExecution` call a
 * human approval uses, and its audit stamp names the acting user, so this literal is the
 * only thing that distinguishes the two in history.
 *
 * Changing this prefix orphans attribution on already-answered gates. That is accepted, not a bug.
 */
export const PND_AUTO_RESPOND_RATIONALE_PREFIX = 'Auto-accepted by PND autonomy at level ' as const;

/**
 * HITL channels `_auto_respond` stamps, selected by the request's `origin`.
 *
 * `auto` is the machine path (the auto-approver after `.6`). `dial` is the operator
 * raising the autonomy level. "Answered by" distinguishes the two from the rationale suffix.
 */
export const PND_AUTO_RESPOND_CHANNELS = {
  auto: 'pnd-autonomy-auto',
  dial: 'pnd-autonomy-dial',
} as const;

export type PndAutoRespondOrigin = keyof typeof PND_AUTO_RESPOND_CHANNELS;

/** Managed catalog workflow ids — owned by Security. */
export const SYSTEM_SECURITY_WATCH_FLOOR_ID = 'system-security-watch-floor' as const;
export const SYSTEM_SECURITY_WATCH_OFFICER_ID = 'system-security-watch-officer' as const;
export const SYSTEM_SECURITY_WATCH_DARK_ID = 'system-security-watch-dark' as const;
export const SYSTEM_SECURITY_WATCH_DEEP_ID = 'system-security-watch-deep' as const;

/**
 * PND's phase-4 Post-Incident Follow-on watch.
 *
 * Renamed off `system-security-watch-detection` when #283488 merged its own Detection Watch
 * orchestrator at that id — two managed definitions cannot share one, and PND's was the newer
 * claim. `post-incident` names what triggers this watch (containment) rather than what it produces,
 * so it cannot collide with #283488's `system-security-rule-tuning` either.
 *
 * ⛔ This is **not** an alias for #283488's watch. That one is
 * `PND_WATCH_DETECTION_WORKFLOW_ID` in `@kbn/workflows/managed`, it carries
 * {@link WATCH_DETECTION_TAG}, and it is deliberately absent from
 * {@link SYSTEM_SECURITY_WATCH_IDS} — it has no `waitForApproval` step, so it needs no place on the
 * S1 resume allow-list. Kept in sync with `PND_WATCH_POST_INCIDENT_WORKFLOW_ID`, which cannot be
 * imported here (platform may not depend on a solution package); `managed_workflow_drift.test.ts`
 * pins the two together.
 */
export const SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID =
  'system-security-watch-post-incident' as const;

/**
 * The watches whose Triggers section is driven by a **signal** rather than a schedule, mapped to the
 * trigger that drives each.
 *
 * The 2026-08-17 Watch-settings simplification replaces the Frequency select with a "Signal-driven"
 * explanation on such a watch, because a frequency there would be a lie: nothing is polled, and the
 * watch runs when a producer raises the signal.
 *
 * ⛔ Keyed on the **trigger id**, not on a boolean, so the copy can name the signal and so the pairing
 * is checkable. `managed_workflow_drift.test.ts` asserts in both directions that exactly these watch
 * ids subscribe to exactly these triggers in the YAML that actually runs — this map cannot drift into
 * describing a watch as signal-driven that is in fact scheduled, or miss one that is.
 *
 * This is **not** `WatchTriggersSettings.sharedWithAttackDiscovery`. That field is upstream's mock
 * projection for a different callout, which the same decision removed; it is no longer rendered.
 */
export const PND_SIGNAL_DRIVEN_WATCH_TRIGGERS = {
  [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
} as const;

export const SYSTEM_SECURITY_WATCH_IDS = [
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
] as const;

/**
 * The autonomy dial, in ascending order — programme decision D15 (2026-07-28).
 *
 * Deliberately one shared scale rather than per-watch: a level must mean the same thing on every
 * watch, composed with per-callable gates and the org-wide floor. Only the *selected* level varies
 * per watch. See https://github.com/elastic/security-team/issues/18718.
 */
export const WATCH_AUTONOMY_LEVELS = ['manual', 'assisted', 'supervised'] as const;

/**
 * Presentation metadata for the managed watch catalog.
 *
 * The managed five are compile-time constants installed at start-up, so consumers that must not wait
 * for an HTTP round trip — the app's deep links and the solution navigation tree — build their
 * entries from this list rather than from `list_watches`.
 *
 * Deliberately free of schema and sample imports: both consumers are page-load critical, and pulling
 * `WATCHES_SEED` in would drag Zod and the mock samples into that bundle. `WATCHES_SEED` derives its
 * name, colour and lifecycle from here so the two cannot drift.
 *
 * Custom (unmanaged) watches are absent by construction — they are discoverable only at runtime.
 */
export const SYSTEM_SECURITY_WATCH_CATALOG = [
  {
    id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    deepLinkId: SecurityPageName.pndWatchFloor,
    name: 'Watch Floor',
    color: '#16b3a6',
  },
  {
    id: SYSTEM_SECURITY_WATCH_OFFICER_ID,
    deepLinkId: SecurityPageName.pndWatchOfficer,
    name: 'Watch Officer',
    color: '#3b82f6',
  },
  {
    id: SYSTEM_SECURITY_WATCH_DARK_ID,
    deepLinkId: SecurityPageName.pndWatchDark,
    name: 'Dark Watch',
    color: '#f59e0b',
    isBeta: true,
  },
  {
    id: SYSTEM_SECURITY_WATCH_DEEP_ID,
    deepLinkId: SecurityPageName.pndWatchDeep,
    name: 'Forensic Watch',
    color: '#8b5cf6',
    isBeta: true,
  },
  {
    id: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
    deepLinkId: SecurityPageName.pndWatchPostIncident,
    name: 'Post-Incident Watch',
    color: '#ec4899',
    isBeta: true,
  },
] as const;

export type SystemSecurityWatchCatalogEntry = (typeof SYSTEM_SECURITY_WATCH_CATALOG)[number];

/**
 * Managed PND watch workflow ids that `_respond` / `_auto_respond` are allow-listed to
 * (security finding S1). Resuming a HITL step runs arbitrary downstream workflow
 * steps, so those routes must reject any workflow id outside this set. Kept as an
 * alias of {@link SYSTEM_SECURITY_WATCH_IDS} so the two never drift.
 */
export const PND_WATCH_WORKFLOW_IDS = SYSTEM_SECURITY_WATCH_IDS;

export const WATCH_TAG = 'watch' as const;
export const WATCH_FLOOR_TAG = 'watch-floor' as const;
export const WATCH_OFFICER_TAG = 'watch-officer' as const;
export const WATCH_DARK_TAG = 'watch-dark' as const;
export const WATCH_DEEP_TAG = 'watch-deep' as const;

/**
 * Tier tag of **#283488's** Detection Watch (`PND_WATCH_DETECTION_WORKFLOW_ID`), not ours.
 *
 * Deliberately kept at its upstream bytes rather than renamed: `watch_detection.yaml` declares this
 * tag, so renaming the constant would only decouple it from the YAML it names. Ours is
 * {@link WATCH_POST_INCIDENT_TAG}.
 */
export const WATCH_DETECTION_TAG = 'watch-detection' as const;

/** Tier tag of PND's phase-4 watch, {@link SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}. */
export const WATCH_POST_INCIDENT_TAG = 'watch-post-incident' as const;

export const WATCH_CUSTOM_TAG = 'watch-custom' as const;

/**
 * Every managed tier tag, ours and #283488's.
 *
 * Documentation only: `projectWorkflowToWatch` passes a workflow's YAML `tags` straight through and
 * `list_watches` filters on {@link WATCH_TAG} alone, so no runtime behaviour reads this array. It
 * exists so the tag vocabulary has one home.
 */
export const WATCH_TIER_TAGS = [
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_DARK_TAG,
  WATCH_DEEP_TAG,
  WATCH_DETECTION_TAG,
  WATCH_POST_INCIDENT_TAG,
] as const;

/**
 * Restored with the investigation and proposal fixtures that are their only consumers
 * ([#284440](https://github.com/elastic/kibana/pull/284440), register #45). `TEMPLATE_IDS` still
 * has none; it is kept because it is part of upstream's exported surface.
 *
 * ⛔ Do **not** add a `TEMPLATE_ID_TUNING`. `template_id` is a discriminated-union type tag, not a
 * classification field — the generated schemas declare it as `z.literal(...)` on each entity, which
 * makes a parallel constant redundant by construction. A rule tuning is already covered by the
 * locked model as a `Proposal` in the `tune` bucket (`RecommendedAction`), so there is nothing to
 * add.
 */
export const TEMPLATE_ID_INVESTIGATION = 'investigation' as const;
export const TEMPLATE_ID_PROPOSAL = 'proposal' as const;
export const TEMPLATE_ID_INCIDENT = 'incident' as const;

export const TEMPLATE_IDS = [
  TEMPLATE_ID_INVESTIGATION,
  TEMPLATE_ID_PROPOSAL,
  TEMPLATE_ID_INCIDENT,
] as const;

export const API_VERSIONS = {
  internal: {
    v1: '1',
  },
} as const;

export const INTERNAL_API_ACCESS = 'internal' as const;

export const RECOMMENDED_ACTIONS = ['contain', 'escalate', 'investigate', 'tune'] as const;

export const PROPOSAL_STATUSES = [
  'pending',
  'approved',
  'modified',
  'dismissed',
  'executed',
] as const;

export const CONVERSATION_CATEGORY_COLORS: Record<
  RecommendedAction,
  'danger' | 'warning' | 'accentSecondary' | 'accent'
> = {
  contain: 'danger',
  escalate: 'warning',
  investigate: 'accentSecondary',
  tune: 'accent',
};
