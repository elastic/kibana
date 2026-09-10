/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import { ALERTZERO_PROPOSAL_BASELINE_CATEGORIES } from '@kbn/alertzero-common';
import {
  CLOSED_GROUP_KEY,
  type ProposalActivityGroups,
  type ProposalActivityItem,
} from '../../../common/proposals/activity';

export const groupProposalActivity = (
  proposals: ProposalWithMetadata[],
  titles: Map<string, string>
): ProposalActivityGroups => {
  const groups: ProposalActivityGroups = { [CLOSED_GROUP_KEY]: [] };
  for (const cat of ALERTZERO_PROPOSAL_BASELINE_CATEGORIES) {
    groups[cat] = [];
  }

  for (const proposal of proposals) {
    const item: ProposalActivityItem = {
      ...proposal,
      ...(titles.has(proposal.conversationId)
        ? { conversationTitle: titles.get(proposal.conversationId) }
        : {}),
    };

    if (proposal.decidedAt) {
      groups[CLOSED_GROUP_KEY].push(item);
    } else {
      const key = proposal.category;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
  }

  groups[CLOSED_GROUP_KEY].sort((a, b) => {
    if (!a.decidedAt || !b.decidedAt) return 0;
    return b.decidedAt.localeCompare(a.decidedAt);
  });

  return groups;
};
