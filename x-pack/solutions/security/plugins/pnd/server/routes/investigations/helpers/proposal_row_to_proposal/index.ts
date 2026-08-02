/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow, Proposal, ProposalStatus } from '@kbn/pnd-common';
import { TEMPLATE_ID_PROPOSAL } from '@kbn/pnd-common';

export interface ProposalRowToProposalParams {
  /** The investigation this proposal was read for — the `{id}` path param. */
  parentConversationId: string;
  row: PndProposalRow;
}

/**
 * How a gate was answered, in the `Proposal` contract's own vocabulary.
 *
 * `decision` is absent on a pending row, which is the only kind
 * `GET /internal/pnd/investigations/{id}/proposals` reads today; the two answered cases are mapped
 * anyway so the same projection serves the history without a second `status` rule appearing
 * somewhere else. `modified` and `executed` are deliberately unreachable: `_respond` closed its
 * decision field to `approve | dismiss` (security finding D2), so claiming either would be inventing
 * a state no gate can be in.
 */
const toProposalStatus = (decision: PndProposalRow['decision']): ProposalStatus => {
  if (decision === 'approve') return 'approved';
  if (decision === 'dismiss') return 'dismissed';

  return 'pending';
};

/**
 * Project a pending-gate {@link PndProposalRow} onto the {@link Proposal} contract.
 *
 * This is the whole of "one proposals contract": the queue's row and the per-investigation
 * response describe the same object, so the second is *derived* from the first here rather than
 * declared as a parallel type. Fields that mean the same thing in both are mapped across; the ones a
 * real gate carries and `Proposal` had no field for were added to `Proposal` as optional properties
 * (epic decision 9 — contracts widen additively) and are copied through unchanged, under the same
 * names, so a rename cannot make the two halves disagree.
 *
 * Nothing is invented to satisfy a required field:
 *
 * - `confidence` is **omitted**. There is no measured confidence at a parked gate, and
 *   `security.detectionChangeSignal` already made the same field optional for the same reason. It
 *   became optional on `Proposal` for this projection.
 * - `evidenceRefs` cites the correlated discovery as a **ref**, never inline evidence (D7), and is
 *   empty for an uncorrelated gate rather than carrying a blank id.
 * - `assignee` and `sla` are `null` — nullable in the contract, and nobody is assigned a parked gate
 *   and no deadline is attached to one.
 * - `events` is empty: a gate is a point in time, not a timeline, and the run's real timeline is
 *   served by `GET /internal/pnd/executions/{id}`.
 *
 * `id` and `sourceId` carry the same value on purpose. `id` is how this contract addresses a
 * proposal and `sourceId` is how `_respond` addresses the parked gate, so a client holding only a
 * `Proposal` can still answer it.
 */
export const proposalRowToProposal = ({
  parentConversationId,
  row,
}: ProposalRowToProposalParams): Proposal => ({
  alwaysGate: row.alwaysGate,
  approvalRequired: true,
  assignee: null,
  // Absent, never blank — the same rule the row follows, so a surface can tell "no discovery" from
  // "a discovery at id ''".
  ...(row.correlationId === '' ? {} : { correlationId: row.correlationId }),
  createdAt: row.createdAt,
  evidenceRefs:
    row.correlationId === '' ? [] : [{ id: row.correlationId, type: 'attack_discovery' }],
  events: [],
  gateId: row.gateId,
  id: row.sourceId,
  inputSchema: row.inputSchema,
  parentConversationId,
  ...(row.preview == null ? {} : { preview: row.preview }),
  reasoning: row.reasoning,
  recommendation: row.message,
  reversible: row.reversible,
  sla: null,
  sourceId: row.sourceId,
  sourceWatchId: row.workflowId,
  status: toProposalStatus(row.decision),
  // The row's display title: the paired thread's title once it has materialised, else the gate
  // prompt's — byte-for-byte what `HitlActionCard` names the proposal by.
  summary: row.threadTitle ?? row.title,
  template_id: TEMPLATE_ID_PROPOSAL,
  ...(row.threadConversationId == null ? {} : { threadConversationId: row.threadConversationId }),
  type: row.recommendedAction,
});
