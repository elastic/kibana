/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';

import type { QueueDecision } from '../../../queue';
import { APPROVED, DISMISSED } from '../../../../pages/conversations/translations';

/**
 * A recorded decision for demote-in-place inside a nested {@link ThreadGroupCard}.
 * Pending rows — and top-level type sections — must not call this: groups are
 * pending-only, and demote applies only to a resolved child among pending siblings.
 */
export const queueDecisionFromProposal = (proposal: PndProposalRow): QueueDecision | undefined => {
  if (proposal.decision === 'approve') {
    return { label: APPROVED };
  }

  if (proposal.decision === 'dismiss') {
    return { label: DISMISSED };
  }

  return undefined;
};
