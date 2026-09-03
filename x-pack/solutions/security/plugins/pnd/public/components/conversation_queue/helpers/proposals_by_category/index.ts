/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_QUEUE_CATEGORIES } from '@kbn/pnd-common';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import { comparePendingProposals } from '../compare_pending_proposals';

export interface CategoryBucket {
  action: RecommendedAction;
  label: string;
  proposals: readonly PndProposalRow[];
}

export interface ProposalsByCategoryArgs {
  groups: readonly PndProposalGroup[];
  riskScoreByDiscovery?: ReadonlyMap<string, number>;
}

/**
 * Turns the route's sparse action groups into the four category buckets, in
 * `CONVERSATION_QUEUE_CATEGORIES` order, with pending rows sorted by the queue's
 * one comparator. Empty buckets stay present so type-mode can draw zeroes.
 */
export const proposalsByCategory = ({
  groups,
  riskScoreByDiscovery,
}: ProposalsByCategoryArgs): readonly CategoryBucket[] => {
  const compare = comparePendingProposals({ riskScoreByDiscovery });

  return CONVERSATION_QUEUE_CATEGORIES.map(({ id, label }) => ({
    action: id,
    label,
    proposals: groups
      .filter(({ recommendedAction }) => recommendedAction === id)
      .flatMap(({ proposals }) => proposals)
      .slice()
      .sort(compare),
  }));
};
