/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RECOMMENDED_ACTIONS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../../constants';
import { resolvePndWatchDefinitionId } from '../../watches/pnd_watch_document_id';
import type { PndConversationKind } from '../../conversations/derive_conversation_ids';
import type { RecommendedAction } from '../../schemas';

/**
 * HITL gate registry (security finding S4/S5, plan §"HITL proposal metadata").
 *
 * `waitForInput`'s `with.schema` is a closed zod object that silently strips
 * unknown keys, so gate metadata can never ride on the YAML. Instead it lives in
 * this type-safe constant map, keyed by `(workflowId, stepId)` and immune to YAML
 * drift. The server enriches a pending gate from here; `_auto_respond` reads `alwaysGate`
 * here to refuse consequential gates regardless of autonomy level.
 */

/**
 * `waitForInput` step ids for the four gates. These are the exact orchestrator
 * step names the Watch Floor (kibana-idjb.8, relocated there from the Deep Watch by
 * kibana-phf4.5) and Detection Watch (kibana-idjb.10) YAML must use — the registry is
 * keyed by them, and `_respond` rejects any `stepId` not present here.
 */
export const PND_GATE_STEP_IDS = {
  awaitApplyTuning: 'await_apply_tuning',
  awaitIncidentContained: 'await_incident_contained',
  awaitOpenInvestigation: 'await_open_investigation',
  awaitPromoteIncident: 'await_promote_incident',
} as const;

export type PndGateStepId = (typeof PND_GATE_STEP_IDS)[keyof typeof PND_GATE_STEP_IDS];

/**
 * Short gate ids, used as the keys of the autonomy `autoAccept` map that the
 * orchestrator reads fail-closed (e.g. `not …autoAccept.open_investigation : true`).
 */
export const PND_GATE_IDS = {
  applyTuning: 'apply_tuning',
  incidentContained: 'incident_contained',
  openInvestigation: 'open_investigation',
  promoteIncident: 'promote_incident',
} as const;

export type PndGateId = (typeof PND_GATE_IDS)[keyof typeof PND_GATE_IDS];

/**
 * Phase-catalog gate-row ids each gate maps to. Consumed by the phase catalog
 * (kibana-idjb.1, `impl/lifecycle/phase_catalog`) so the four HITL gates line up
 * with their position in the four-phase flyout skeleton.
 */
export const PND_GATE_PHASE_STEP_IDS = {
  applyTuning: 'gate-apply-tuning',
  incidentContained: 'gate-incident-contained',
  openInvestigation: 'gate-open-investigation',
  promoteIncident: 'gate-promote-incident',
} as const;

export type PndGatePhaseStepId =
  (typeof PND_GATE_PHASE_STEP_IDS)[keyof typeof PND_GATE_PHASE_STEP_IDS];

/**
 * What a gate's decision is *about* (D2, and D16 from project-daybreak PR #107).
 *
 * A Proposal is a **card, never a container**: exactly two gates open a container — the
 * Investigation and the Incident — and nothing may ever add a third. Encoding that as a field
 * rather than as a convention makes the invariant type-checked and testable
 * (`index.test.ts` pins the container count at two).
 *
 * - `container` — the gate decides whether to open one of the two containers.
 * - `proposal_thread` — the gate is a proposal card inside a container that already exists.
 * - `worker_thread` — the gate is answered by a specialist worker rather than by the container's
 *   own agent. `apply_tuning` is the only one: ADR-013 reclassified `tuning` from "a third kind of
 *   container" to a worker thread, while `PND_TUNING_NAMESPACE` kept its exact bytes.
 */
export type PndGateRole = 'container' | 'proposal_thread' | 'worker_thread';

/**
 * Which of the two containers a gate's thread hangs under.
 *
 * Deliberately narrower than {@link PndConversationKind}: `tuning` is a worker thread, not a
 * container, so it can never be a parent. Parentage is **re-derived on read, never stored** (D4).
 * kibana-tjil.8 / C4 mints the investigation container before the first gate, so an orphan
 * investigation thread is now a genuine error rather than the normal case. `promote_incident`
 * still fires before the incident conversation exists. `.11` models the incident as a
 * sibling via `promotedFrom` (the investigation does not know about its incidents); minting
 * the incident container before that gate parks is still outstanding.
 */
export type PndGateParentKind = 'incident' | 'investigation';

export interface PndGateDefinition {
  /**
   * Queue / chat row action: imperative verb + object, at most 30 characters, never a bare
   * "Approve", never a noun (e.g. "Open an investigation").
   */
  actionLabel: string;
  /** Managed watch workflow id that owns the gate. */
  workflowId: string;
  /** `waitForInput` step id (the registry key). */
  stepId: PndGateStepId;
  /** Short gate id, also the autonomy `autoAccept` map key. */
  gateId: PndGateId;
  /** Brief bucket the proposal groups under; comes from {@link RECOMMENDED_ACTIONS}. */
  recommendedAction: RecommendedAction;
  /** Whether the action can be undone (drives Assisted-level auto-accept). */
  reversible: boolean;
  /** Consequential gates that no autonomy level may ever bypass (D15 invariant). */
  alwaysGate: boolean;
  /**
   * Resume-payload fragment `_auto_respond` sends for this gate. Present **iff**
   * `alwaysGate` is false — those gates park at every autonomy level and must never
   * be auto-approved. The live payload is this object plus the auto-respond rationale prefix.
   */
  autoApproveResponse?: { decision: 'approve' };
  /** Gate-row id in the four-phase catalog. */
  phaseStepId: PndGatePhaseStepId;
  /** What the gate's decision is about. @see {@link PndGateRole} */
  role: PndGateRole;
  /** Container the gate's thread hangs under, recovered on read. @see {@link PndGateParentKind} */
  parentKind: PndGateParentKind;
  /**
   * Which of the three installed PND agents answers this gate's thread. There is deliberately no
   * fourth agent (D3): `ensurePndAgents` is all-or-nothing and `conversations.list()` intersects on
   * accessible agent ids, so a fourth would be a new failure mode for zero gain.
   *
   * Equal to {@link parentKind} on every gate except `apply_tuning`, where the tuning specialist
   * answers a thread that still belongs to the incident.
   */
  threadAgentKind: PndConversationKind;
}

/**
 * The four gates. `recommendedAction` values are drawn from {@link RECOMMENDED_ACTIONS}
 * rather than fresh literals so the buckets can never drift from the Brief.
 *
 * The D2 classification, read as one table:
 *
 * | gate | role | parentKind | threadAgentKind |
 * |---|---|---|---|
 * | `open_investigation` | `container` | `investigation` | `investigation` |
 * | `promote_incident` | `container` | `incident` | `incident` |
 * | `incident_contained` | `proposal_thread` | `incident` | `incident` |
 * | `apply_tuning` | `worker_thread` | `incident` | `tuning` |
 *
 * The two `container` gates are the two that *open* a container, and their `parentKind` is the
 * container they open. kibana-tjil.8 / C4 mints the investigation container before
 * `await_open_investigation` parks, so that gate's thread has a parent from the start;
 * `promote_incident` still fires before the incident conversation exists. `apply_tuning` is the
 * single row where `parentKind` and `threadAgentKind` diverge: a tuning proposal belongs to the
 * incident that produced it, but the detection-tuning agent is the one that answers its thread.
 *
 * `workflowId` is the **only** field that names the watch a gate belongs to, and nothing else in PND
 * derives a gate, a thread or a conversation from a watch id — the four older UUIDv5 namespaces
 * key on the attack discovery alert id and the `gateId` (D1/ADR-003/ADR-012), never on the watch.
 * `PND_WORKER_NAMESPACE` is the exception: it is keyed on `(alertId, workerWorkflowId)` so two
 * workers on one alert cannot share an id. That is why
 * kibana-phf4.5 could move the whole lane from the Deep Watch to the Watch Floor by editing exactly
 * these three rows (ADR-015) without renaming a single conversation. Keep it that way: a second copy
 * of the owning watch id anywhere would make the next relocation a migration.
 */
export const PND_GATE_REGISTRY: readonly PndGateDefinition[] = [
  {
    actionLabel: 'Open an investigation',
    alwaysGate: false,
    autoApproveResponse: { decision: 'approve' },
    gateId: PND_GATE_IDS.openInvestigation,
    parentKind: 'investigation',
    phaseStepId: PND_GATE_PHASE_STEP_IDS.openInvestigation,
    recommendedAction: RECOMMENDED_ACTIONS[2], // investigate
    reversible: true,
    role: 'container',
    stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
    threadAgentKind: 'investigation',
    workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  },
  {
    actionLabel: 'Escalate to an incident',
    alwaysGate: false,
    autoApproveResponse: { decision: 'approve' },
    gateId: PND_GATE_IDS.promoteIncident,
    parentKind: 'incident',
    phaseStepId: PND_GATE_PHASE_STEP_IDS.promoteIncident,
    recommendedAction: RECOMMENDED_ACTIONS[1], // escalate
    reversible: false,
    role: 'container',
    stepId: PND_GATE_STEP_IDS.awaitPromoteIncident,
    threadAgentKind: 'incident',
    workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  },
  {
    actionLabel: 'Confirm containment',
    alwaysGate: true,
    gateId: PND_GATE_IDS.incidentContained,
    parentKind: 'incident',
    phaseStepId: PND_GATE_PHASE_STEP_IDS.incidentContained,
    recommendedAction: RECOMMENDED_ACTIONS[0], // contain
    reversible: false,
    role: 'proposal_thread',
    stepId: PND_GATE_STEP_IDS.awaitIncidentContained,
    threadAgentKind: 'incident',
    workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  },
  {
    actionLabel: 'Apply the rule tuning',
    alwaysGate: true,
    gateId: PND_GATE_IDS.applyTuning,
    parentKind: 'incident',
    phaseStepId: PND_GATE_PHASE_STEP_IDS.applyTuning,
    recommendedAction: RECOMMENDED_ACTIONS[3], // tune
    reversible: false,
    role: 'worker_thread',
    stepId: PND_GATE_STEP_IDS.awaitApplyTuning,
    threadAgentKind: 'tuning',
    workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  },
];

/**
 * The two levels that auto-accept anything, named off {@link WATCH_AUTONOMY_LEVELS} rather than
 * spelled as literals so the scale has exactly one definition. `manual` needs no name here: it is
 * the fail-closed default every comparison below falls through to.
 */
const [, ASSISTED, SUPERVISED] = WATCH_AUTONOMY_LEVELS;

const compositeKey = (workflowId: string, stepId: string): string => `${workflowId}::${stepId}`;

const REGISTRY_BY_KEY: ReadonlyMap<string, PndGateDefinition> = new Map(
  PND_GATE_REGISTRY.map((gate) => [compositeKey(gate.workflowId, gate.stepId), gate])
);

/**
 * Look up a gate by `(workflowId, stepId)`. Returns `undefined` for any pair not
 * in the registry — the fail-closed primitive behind {@link isGateAutoAcceptable}
 * and the `_respond` allow-list.
 */
export const getGateDefinition = (
  workflowId: string,
  stepId: string,
  spaceId?: string
): PndGateDefinition | undefined => {
  const definitionId = resolvePndWatchDefinitionId(workflowId, spaceId) ?? workflowId;
  return REGISTRY_BY_KEY.get(compositeKey(definitionId, stepId));
};

const REGISTRY_BY_GATE_ID: ReadonlyMap<string, PndGateDefinition> = new Map(
  PND_GATE_REGISTRY.map((gate) => [gate.gateId, gate])
);

/**
 * Look up a gate by its short `gateId` alone, rather than by `(workflowId, stepId)`.
 *
 * This is the lookup every *thread* surface needs: a thread is keyed on
 * `(correlationId, gateId)` (D1) — the same key `dedupeProposals` already uses — so the
 * gate id is the only part of the registry a thread id carries. Fail-closed like
 * {@link getGateDefinition}: anything outside the registry, including a `waitForInput` step id,
 * returns `undefined` rather than a partially-populated gate.
 */
export const getGateDefinitionByGateId = (gateId: string): PndGateDefinition | undefined =>
  REGISTRY_BY_GATE_ID.get(gateId);

/**
 * Whether the gate `gateId` names always requires a human, at every autonomy level (D15).
 *
 * The registry is the one place `alwaysGate` is written down, and `_auto_respond` re-reads it there
 * on every request (`partition_auto_respondable_gates`, security finding S5). This is how a caller
 * that knows a gate
 * only by its **short id** asks, rather than by the `(workflowId, stepId)` pair the registry is keyed
 * on, so nothing has to carry its own copy of the flag.
 *
 * ⚠️ It has no production caller today. Its two — the Watch settings page's Approval Gates table and
 * the `setWatchApprovalGates` store write behind it — went with that section in bead kibana-phf4.33,
 * per the 2026-08-10 design. It is kept, rather than deleted with them, because it is one of D15's
 * three written-down homes: `index.test.ts` asserts it agrees with `PND_GATE_REGISTRY` for every row,
 * so a future surface that reaches for the flag by gate id cannot get an answer that has drifted.
 *
 * Fail-closed in the sense that matters for a *settings* surface: an id the registry does not know is
 * not an `alwaysGate` gate, because it is not a gate at all. Callers must still refuse an unknown id
 * on its own terms rather than reading `false` here as permission.
 */
export const isAlwaysGate = (gateId: string): boolean =>
  getGateDefinitionByGateId(gateId)?.alwaysGate === true;

/**
 * The gates that a given autonomy level auto-accepts:
 * - `manual`: none
 * - `assisted`: only reversible gates
 * - `supervised`: all gates except those flagged `alwaysGate`
 *
 * Levels are the shared {@link WATCH_AUTONOMY_LEVELS} names rather than ordinals, so the one scale
 * the settings contract, uiSettings and the slider all speak is the one this resolves against.
 *
 * Fail-closed by construction: anything outside that scale — including a legacy `1`/`2`/`3` that
 * survived in persisted state — yields an empty set, which leaves every gate waiting for a human.
 */
export const resolveAutoAcceptableGates = (autonomyLevel: unknown): PndGateDefinition[] => {
  if (autonomyLevel === ASSISTED) return PND_GATE_REGISTRY.filter((gate) => gate.reversible);
  if (autonomyLevel === SUPERVISED) return PND_GATE_REGISTRY.filter((gate) => !gate.alwaysGate);
  return [];
};

/**
 * Whether the gate at `(workflowId, stepId)` is auto-acceptable at the given level.
 * Fail-closed on every unknown input: an unregistered gate, or a level outside
 * {@link WATCH_AUTONOMY_LEVELS}, is never auto-acceptable.
 */
export const isGateAutoAcceptable = (
  workflowId: string,
  stepId: string,
  autonomyLevel: unknown
): boolean => {
  const gate = getGateDefinition(workflowId, stepId);
  if (gate == null) return false;
  if (autonomyLevel === ASSISTED) return gate.reversible;
  if (autonomyLevel === SUPERVISED) return !gate.alwaysGate;
  return false;
};
