/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_IDS } from '@kbn/pnd-common';
import type { ListProposalsResponse, PndProposalRow, PndTuningPreview } from '@kbn/pnd-common';

import type { PndTunableRuleChange } from '../../../proposed_rule_change';

/** The one gate whose pending proposal carries detection-tuning evidence (phase 4.3). */
export const TUNING_EVIDENCE_GATE_ID: string = PND_GATE_IDS.applyTuning;

export interface SelectTuningProposalParams {
  correlationId: string;
  groups: ListProposalsResponse['groups'];
}

/**
 * The pending `await_apply_tuning` gate for one discovery, or `undefined`.
 *
 * An empty `correlationId` never matches: the proposals route uses `''` for a gate it could
 * not correlate to a discovery, so matching on it would attach another run's evidence to this
 * lifecycle. Only a pending gate is visible here — once the tuning is applied or dismissed the gate
 * resolves and its evidence stops being available, which is why the phase-4 rows render evidence
 * only while the loop is parked at 4.3.
 */
export const selectTuningProposal = ({
  correlationId,
  groups,
}: SelectTuningProposalParams): PndProposalRow | undefined =>
  correlationId === ''
    ? undefined
    : groups
        .flatMap(({ proposals }) => proposals)
        .find(
          (proposal) =>
            proposal.gateId === TUNING_EVIDENCE_GATE_ID && proposal.correlationId === correlationId
        );

export interface PndTuningEvidence {
  /** The structured rule patch, once the contract carries one. */
  change?: PndTunableRuleChange;
  /** The before/after backtest. Absent is a real outcome and must be said out loud. */
  preview?: PndTuningPreview;
  /** What the model wrote about the tuning it drafted. */
  reasoning?: string;
  ruleId?: string;
}

/**
 * `PndProposalRow` widened with the two fields a later contract revision is expected to add.
 *
 * `PndProposalRow` is a closed object today: it carries `preview` and `reasoning` but not the
 * structured `change`/`ruleId` that workstream B6 threads from `draft_tuning` through the approval.
 * Declaring them as `unknown` here lets the flyout light up the moment they arrive, without
 * pretending they are typed and without a cast at the call site.
 */
export type TuningProposal = PndProposalRow & { change?: unknown; ruleId?: unknown };

const asChange = (value: unknown): PndTunableRuleChange | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as PndTunableRuleChange)
    : undefined;

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

/**
 * The evidence a phase-4 tuning row renders: what the model proposed, and what the backtest
 * measured. Every field is optional and model-authored, so each is read defensively — a missing
 * backtest becomes an explicit "no backtest available" downstream rather than a blank.
 */
export const readTuningEvidence = (proposal: TuningProposal | undefined): PndTuningEvidence => {
  if (proposal == null) {
    return {};
  }

  const change = asChange(proposal.change);
  const reasoning = asNonEmptyString(proposal.reasoning);
  const ruleId = asNonEmptyString(proposal.ruleId);

  return {
    ...(change != null ? { change } : {}),
    ...(proposal.preview != null ? { preview: proposal.preview } : {}),
    ...(reasoning != null ? { reasoning } : {}),
    ...(ruleId != null ? { ruleId } : {}),
  };
};
