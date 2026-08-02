/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';

import { getHitlActionIcon } from '../../../hitl_action_card/helpers/get_hitl_action_icon';
import { getHitlTone } from '../../../hitl_action_card/helpers/get_hitl_tone';
import type { QueueEvent } from '../../types';
import { actionLabel } from '../action_label';

export interface QueueEventFromProposalArgs {
  readonly proposal: PndProposalRow;
  readonly riskScore?: number;
}

/**
 * PND skin of {@link QueueEvent}: title/description from the row, action from
 * `gate.actionLabel`. NightShift injects its own event shape at this boundary.
 */
export const queueEventFromProposal = ({
  proposal,
  riskScore,
}: QueueEventFromProposalArgs): QueueEvent => ({
  actionIcon: getHitlActionIcon(proposal.recommendedAction),
  actionLabel: actionLabel(proposal.gateId),
  actionTone: getHitlTone({
    recommendedAction: proposal.recommendedAction,
    reversible: proposal.reversible,
  }),
  caseId: proposal.correlationId.length > 0 ? proposal.correlationId : proposal.sourceId,
  description: proposal.message,
  gateId: proposal.gateId,
  id: proposal.sourceId,
  recommendedAction: proposal.recommendedAction,
  reversible: proposal.reversible,
  riskScore,
  threadConversationId: proposal.threadConversationId,
  title: proposal.threadTitle ?? proposal.title,
});
