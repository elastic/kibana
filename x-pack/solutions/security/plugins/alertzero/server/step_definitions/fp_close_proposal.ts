/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID } from '@kbn/workflows/managed';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../common/proposals/origin';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

/**
 * Most alert ids one closure proposal carries. Matches the `fp_candidate_ids.maxItems` of the
 * Alert Triage closure review, so a coalesced proposal never grows past what one batch may hold.
 */
export const MAX_FP_CLOSE_ALERT_IDS = 10_000;

/** A rule's Investigations hold one pending closure proposal, so a small page always finds it. */
const PENDING_PROPOSAL_PAGE_SIZE = 20;

export interface FpCloseStepDependencies {
  getProposals: () => ProposalsPluginStart;
  /** False when the Context Engine is unavailable, so there is no index for the pointers. */
  isPointerStoreAvailable: boolean;
}

export interface PendingFpCloseProposal {
  proposalId: string;
  alertIds: string[];
}

export const alertIdsOf = (actionInput: Record<string, unknown> | undefined): string[] => {
  const alertIds = actionInput?.alertIds;
  return Array.isArray(alertIds)
    ? alertIds.filter((id): id is string => typeof id === 'string')
    : [];
};

export const unionAlertIds = (existing: string[], added: string[]): string[] => [
  ...new Set([...existing, ...added]),
];

/**
 * The live, undecided false positive closure proposal on an Investigation, if there is one. The
 * newest wins when a lost race left two.
 */
export const findPendingFpCloseProposal = async ({
  service,
  conversationId,
  spaceId,
  request,
}: {
  service: ProposalsService;
  conversationId: string;
  spaceId: string;
  request: KibanaRequest;
}): Promise<PendingFpCloseProposal | undefined> => {
  const { proposals } = await service.list(
    {
      conversationId,
      origin: ALERTZERO_PROPOSAL_ORIGIN,
      status: 'pending',
      excludeSuperseded: true,
      excludeExpired: true,
      size: PENDING_PROPOSAL_PAGE_SIZE,
      from: 0,
    },
    spaceId,
    request,
    [{ createdAt: { order: 'desc' } }]
  );

  const proposal = proposals.find(
    ({ actionWorkflowId, decision }) =>
      actionWorkflowId === ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID && decision == null
  );
  return proposal
    ? { proposalId: proposal.id, alertIds: alertIdsOf(proposal.actionInput) }
    : undefined;
};

/** Same wording as the comment the closure review raises the proposal with. */
export const buildFpCloseComment = ({
  alertCount,
  ruleName,
  confidenceFloor,
}: {
  alertCount: number;
  ruleName?: string;
  confidenceFloor: number;
}): string =>
  `${alertCount} ${alertCount === 1 ? 'alert' : 'alerts'} from rule "${ruleName ?? ''}" ${
    alertCount === 1 ? 'was' : 'were'
  } classified as false positives at or above the configured confidence floor (${confidenceFloor}). ` +
  'Later runs of the rule add their false positives to this proposal. ' +
  'Approving this proposal will close them with workflow_reason=false_positive.';
