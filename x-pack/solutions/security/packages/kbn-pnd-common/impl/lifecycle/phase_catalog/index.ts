/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_PHASE_STEP_IDS, PND_GATE_STEP_IDS } from '../../proposals/gate_registry';

/**
 * The four-phase "Attack Discovery and Investigation" lifecycle skeleton that Epic 2's flyout
 * renders (plan §"The four-phase execution view"). It models the ten lifecycle steps this product
 * actually realizes plus the four phase-gate rows: eight steps and all four gates are executed by
 * the thin slice, and the remaining two are performed `upstream` by Attack Discovery before PND
 * runs.
 *
 * Rows that were only documented and never built (`not_in_slice`) were deleted in kibana-phf4.12
 * rather than renumbered: a catalog row is a promise that something is observable, and 12 rows that
 * could only ever render "not implemented" cost more to read than they explained. The four-phase
 * doc remains the place that describes the whole lifecycle.
 *
 * Numbering went with them. Keeping `1.1`, `1.2`, `1.3`, `2.1`, `2.6` … would read as missing work,
 * and renumbering them contiguously would both assert these rows are the whole lifecycle and make
 * our `2.3` mean something different from the source doc's `2.3`. `id` carries identity and the
 * array order carries sequence.
 *
 * Load-bearing (do not change without coordinating downstream): the `id` set, which entries are
 * `live`, their `phase`, and each live entry's `orchestratorStepId`. The projection route
 * (kibana-idjb.14) correlates workflow-execution steps to catalog positions by `orchestratorStepId`,
 * so those strings are the contract the Watch Floor / Detection Watch YAML (kibana-idjb.8 /
 * kibana-idjb.10) must use as step names. The lane's steps live in `watch_floor.yaml` since
 * kibana-phf4.5 (ADR-015), not `watch_deep.yaml`.
 */

export const PHASE_IDS = [
  'signal_triage',
  'investigation',
  'incident_response',
  'post_incident',
] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

/**
 * Whether a step is executed by the thin slice (`live`) or handled by Attack Discovery / existing
 * Elastic Security detections before PND runs (`upstream`).
 *
 * There is deliberately no third member: a row that nothing performs is not in this catalog.
 */
export const PHASE_LIVENESS = ['live', 'upstream'] as const;

export type PhaseLiveness = (typeof PHASE_LIVENESS)[number];

/**
 * Orchestrator step names for the non-gate live steps. The gate live steps use
 * {@link PND_GATE_STEP_IDS} instead. Together these are the exact step names the
 * Watch Floor (kibana-idjb.8) and Detection Watch (kibana-idjb.10) YAML must use.
 */
export const ORCHESTRATOR_STEP_IDS = {
  assessInvestigation: 'assess_investigation',
  deriveIds: 'derive_ids',
  draftTuning: 'draft_tuning',
  openInvestigation: 'create_investigation_container',
  /**
   * `tuning_applied`, **not** `apply_tuning`. The Detection Watch deliberately has no apply step:
   * the consequential rule write happens from the PND UI in the approving user's request context,
   * so `tuning_applied` is the terminal `workflow.output` marker the YAML declares for exactly this
   * projection. Pointing the apply-tuning row at the removed `apply_tuning` left it permanently
   * `not_started` with no deep link even on a completed loop — indistinguishable from "not yet
   * reached".
   */
  tuningApplied: 'tuning_applied',
} as const;

export interface PhaseCatalogEntry {
  /** Stable slug id for the catalog row. */
  id: string;
  label: string;
  description: string;
  phase: PhaseId;
  liveness: PhaseLiveness;
  /** Present for every `live` entry: the orchestrator step it maps to. */
  orchestratorStepId?: string;
}

/** The ten lifecycle steps, phase order preserved. */
export const PHASE_CATALOG_STEPS: readonly PhaseCatalogEntry[] = [
  // --- Phase 1 · Signal Triage -------------------------------------------------
  {
    description:
      'An Attack Discovery 2.0 alert is created; the Watch Floor trigger fires and PND derives the investigation and incident conversation ids.',
    id: 'step-1-1',
    label: 'Attack discovery created',
    liveness: 'live',
    orchestratorStepId: ORCHESTRATOR_STEP_IDS.deriveIds,
    phase: 'signal_triage',
  },
  {
    description:
      'Attack Discovery groups the related alerts, entities and risk into the discovery PND receives.',
    id: 'step-1-2',
    label: 'Signals correlated',
    liveness: 'upstream',
    phase: 'signal_triage',
  },
  {
    description:
      'Attack Discovery writes the attack narrative and Elastic Security scores and ranks it for triage.',
    id: 'step-1-3',
    label: 'Narrative scored & ranked',
    liveness: 'upstream',
    phase: 'signal_triage',
  },
  // --- Phase 2 · Investigation -------------------------------------------------
  {
    description:
      'A tagged Agent Builder investigation conversation is opened at the derived UUIDv5 id.',
    id: 'step-2-1',
    label: 'Open investigation',
    liveness: 'live',
    orchestratorStepId: ORCHESTRATOR_STEP_IDS.openInvestigation,
    phase: 'investigation',
  },
  {
    description:
      "The investigation's own verdict concludes whether the discovery is a true positive worth escalating.",
    id: 'step-2-6',
    label: 'Assess true / false positive',
    liveness: 'live',
    orchestratorStepId: ORCHESTRATOR_STEP_IDS.assessInvestigation,
    phase: 'investigation',
  },
  {
    // "Open an incident", not "Promote to incident": the 2026-08-17 Experience/UX sync, decision 6.
    // These labels are rendered, so the retired verb cannot survive here — see the register.
    description: 'A HITL gate confirms opening an incident from the investigation.',
    id: 'step-2-7',
    label: 'Open an incident',
    liveness: 'live',
    orchestratorStepId: PND_GATE_STEP_IDS.awaitPromoteIncident,
    phase: 'investigation',
  },
  // --- Phase 3 · Incident Response ---------------------------------------------
  {
    description:
      'A HITL gate (always analyst) confirms the incident is contained; PND emits pnd.incidentClosed on resume.',
    id: 'step-3-5',
    label: 'Confirm containment',
    liveness: 'live',
    orchestratorStepId: PND_GATE_STEP_IDS.awaitIncidentContained,
    phase: 'incident_response',
  },
  // --- Phase 4 · Post-Incident Follow-on ---------------------------------------
  {
    description: 'The Detection Watch drafts a detection-rule tuning from the incident.',
    id: 'step-4-2',
    label: 'Draft detection tuning',
    liveness: 'live',
    orchestratorStepId: ORCHESTRATOR_STEP_IDS.draftTuning,
    phase: 'post_incident',
  },
  {
    description: 'A HITL gate (always analyst) approves applying the drafted tuning.',
    id: 'step-4-3',
    label: 'Approve tuning',
    liveness: 'live',
    orchestratorStepId: PND_GATE_STEP_IDS.awaitApplyTuning,
    phase: 'post_incident',
  },
  {
    description: 'The approved tuning is applied to the detection rule.',
    id: 'step-4-4',
    label: 'Apply tuning',
    liveness: 'live',
    orchestratorStepId: ORCHESTRATOR_STEP_IDS.tuningApplied,
    phase: 'post_incident',
  },
];

/** The four phase-gate rows, one per HITL gate. All live. */
export const PHASE_CATALOG_GATES: readonly PhaseCatalogEntry[] = [
  {
    description: 'HITL gate before opening an investigation (gated at Manual only).',
    id: PND_GATE_PHASE_STEP_IDS.openInvestigation,
    label: 'Phase gate — open investigation',
    liveness: 'live',
    orchestratorStepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
    phase: 'signal_triage',
  },
  {
    description: 'HITL gate opening an incident from the investigation.',
    id: PND_GATE_PHASE_STEP_IDS.promoteIncident,
    label: 'Phase gate — open an incident',
    liveness: 'live',
    orchestratorStepId: PND_GATE_STEP_IDS.awaitPromoteIncident,
    phase: 'investigation',
  },
  {
    description: 'HITL gate confirming containment (always analyst; no level bypasses it).',
    id: PND_GATE_PHASE_STEP_IDS.incidentContained,
    label: 'Phase gate — incident contained',
    liveness: 'live',
    orchestratorStepId: PND_GATE_STEP_IDS.awaitIncidentContained,
    phase: 'incident_response',
  },
  {
    description: 'HITL gate applying the detection tuning (always analyst; no level bypasses it).',
    id: PND_GATE_PHASE_STEP_IDS.applyTuning,
    label: 'Phase gate — apply tuning',
    liveness: 'live',
    orchestratorStepId: PND_GATE_STEP_IDS.awaitApplyTuning,
    phase: 'post_incident',
  },
];

/** The full skeleton: the ten lifecycle steps followed by the four phase-gate rows. */
export const PHASE_CATALOG: readonly PhaseCatalogEntry[] = [
  ...PHASE_CATALOG_STEPS,
  ...PHASE_CATALOG_GATES,
];
