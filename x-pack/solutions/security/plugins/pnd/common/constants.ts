/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_APP_ID,
  PND_APP_PATH,
  PND_FEATURE_ID,
  PND_INTERNAL_URL,
  PND_PLUGIN_NAME,
  PND_WATCHES_URL,
  PND_WATCH_URL_TEMPLATE,
  buildWatchUrl,
  SYSTEM_SECURITY_WATCH_IDS,
} from '@kbn/pnd-common';

/** API privilege for read-only PND internal routes. */
export const PND_API_PRIVILEGE_READ = 'pnd_read' as const;

/**
 * API privilege for PND internal routes that mutate state. Only granted by the `all` feature
 * privilege, and every route requiring it is additionally gated on `xpack.pnd.ui.useMockData`.
 */
export const PND_API_PRIVILEGE_WRITE = 'pnd_write' as const;

/**
 * Agent Builder agent ids for the three per-phase PND agents (plan A2).
 *
 * Agent Builder has no conversation templates and no writable conversation metadata (the
 * conversation index is `dynamic: 'strict'` and `Conversation` has no `metadata` field), so
 * `agent_id` is the only queryable stand-in for "which phase opened this thread".
 *
 * `pnd` is neither an internal nor a protected namespace, so these ids are legal for
 * `agents.ensure()` — unlike `security.*`. They are returned to the orchestrators over the wire by
 * `GET /internal/pnd/conversations/_derive` rather than hardcoded in the YAML, so agent existence
 * and agent-id availability succeed or degrade **together** (ADR-011): when `_derive` degrades,
 * `agent-id` renders empty and the `ai.agent` step falls back to the default agent instead of
 * hard-failing on an agent that was never ensured.
 */
export const PND_INCIDENT_AGENT_ID = 'pnd.incident' as const;
/** @see {@link PND_INCIDENT_AGENT_ID} */
export const PND_INVESTIGATION_AGENT_ID = 'pnd.investigation' as const;
/** @see {@link PND_INCIDENT_AGENT_ID} */
export const PND_TUNING_AGENT_ID = 'pnd.detection_tuning' as const;

/**
 * Base name of the Security detection alerts data stream, which is per-space
 * (`.alerts-security.alerts-<spaceId>`).
 *
 * Inlined rather than imported from `security_solution`'s `DEFAULT_ALERTS_INDEX`: that constant lives
 * in a plugin PND does not depend on, and taking a dependency on the Security Solution plugin to read
 * one string is a far bigger commitment than restating it — the same choice
 * {@link ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING} makes below.
 *
 * It lives here rather than beside either query builder because two routes now derive from the same
 * index: `/discovery-context` aggregates its entities and risk score, and `/tuning/candidate-rules`
 * aggregates the rules behind the same alerts. Two copies of the index name would be two places to
 * miss when the data stream is renamed.
 */
export const PND_ALERTS_INDEX_BASE = '.alerts-security.alerts' as const;

/**
 * The per-space Attack Discovery 2.0 Advanced Setting. When it is `false`, the Attack Discovery UI
 * silently falls back to AD 1.0, `security.attackDiscoveryCreated` never fires, and every AD-derived
 * PND surface (proposals, runs, conversations) is legitimately empty — by design. Inlined here rather
 * than imported from `@kbn/security-solution-navigation`, which is not a PND dependency (the same
 * choice the `discoveries` server makes in `is_workflows_enabled_for_space`).
 */
export const ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING =
  'securitySolution:enableAttackDiscoveryWorkflows' as const;

/** Owner id PND registers and installs managed workflows under. */
export const PND_MANAGED_WORKFLOW_OWNER_ID = 'pnd' as const;

/**
 * Response header the AD-derived list routes stamp so a caller can tell an "AD 2.0 not enabled in
 * this space" empty result (`'false'`) apart from a genuinely empty queue (`'true'`), instead of an
 * empty list that reads like a bug. Epic 2's UI reads it to render a hint naming
 * {@link ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING}.
 */
export const PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER =
  'x-pnd-attack-discovery-workflows-enabled' as const;

/**
 * Response header `GET /internal/pnd/executions/{correlationId}` stamps so a caller can
 * tell "no run of any correlated workflow was found for this discovery" (`'false'`) apart from
 * "runs were found and they have not reached these rows yet" (`'true'`).
 *
 * The four-phase skeleton is **always** 11 rows, so an uncorrelated discovery is otherwise
 * indistinguishable from a brand-new one: both render as a skeleton of `not_started` rows, with no
 * error to explain it. Correlation is retrieve-then-filter over a bounded window of recent
 * executions (execution `context` is unmapped), so a discovery older than that window legitimately
 * correlates to nothing — the caller must be able to say so instead of showing a blank timeline.
 *
 * Reading it requires `asResponse: true` on the browser side, exactly like
 * {@link PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER}. The response body is unchanged, so no
 * contract regeneration is involved.
 */
export const PND_EXECUTION_CORRELATED_HEADER = 'x-pnd-execution-correlated' as const;

/**
 * API privilege for responding to a pending HITL gate
 * (`POST /internal/pnd/proposals/{sourceId}/_respond`). Folded into the base PND
 * `all` privilege — responding to the queue is core analyst work — but the route
 * ALSO requires the Workflows `execute` privilege, because resuming a HITL step runs
 * arbitrary downstream workflow steps under the execution's API key (security finding
 * S1). Neither privilege alone is sufficient.
 */
export const PND_API_PRIVILEGE_PROPOSALS_RESPOND = 'pnd_proposals_respond' as const;

/**
 * API privilege for writing a watch's autonomy level (`PUT /internal/pnd/autonomy`).
 * Granted only by the dedicated "Manage autonomy" sub-feature
 * ({@link PND_MANAGE_AUTONOMY_PRIVILEGE_ID}) and therefore grantable independently
 * of `pnd all` — changing autonomy decides how many consequential actions execute
 * without a human, so it is its own grant. The read path (`GET /internal/pnd/autonomy`)
 * does not require it; live GET still requires Workflows managed-read because it
 * re-reads via `get()`.
 */
export const PND_API_PRIVILEGE_AUTONOMY_WRITE = 'pnd_autonomy_write' as const;

/**
 * API privilege for the conversation-write routes: `POST /internal/pnd/threads/_ensure`,
 * `DELETE /internal/pnd/conversations/{conversationId}` and
 * `POST /internal/pnd/conversations/{conversationId}/_rename`.
 *
 * Folded into the base PND `all` privilege rather than a sub-feature, unlike
 * {@link PND_API_PRIVILEGE_AUTONOMY_WRITE}: materialising the thread paired with a proposal is core
 * analyst work, not a decision about how much runs without a human. It is still its own privilege
 * rather than {@link PND_API_PRIVILEGE_READ}, because every route behind it writes Agent Builder
 * state, and because the Watch Floor and Post-Incident Watch call `_ensure` from a `kibana.request`
 * step — so the grant has to be nameable in its own right when reasoning about what that step's
 * identity may do.
 *
 * These routes never become a generic Agent Builder CRUD proxy: each also requires an
 * `correlationId` and asserts the target conversation id is derived from it (security
 * finding S11, `guardDerivedConversationId`). The privilege is the outer boundary; the guard is the
 * inner one, and neither alone is sufficient.
 */
export const PND_API_PRIVILEGE_THREADS_WRITE = 'pnd_threads_write' as const;
