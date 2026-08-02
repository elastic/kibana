/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import { proposalsByCategory } from '../proposals_by_category';

export interface TypeSectionModel {
  action: RecommendedAction;
  count: number;
  label: string;
  proposals: readonly PndProposalRow[];
}

export interface VisibleTypeSectionsArgs {
  groups: readonly PndProposalGroup[];
  isFilterActive: boolean;
  riskScoreByDiscovery?: ReadonlyMap<string, number>;
}

/**
 * Type-mode sections. Groups are pending-only; the header count is the pending
 * length. Empty categories render when a filter is active (zero-state rule),
 * and stay hidden when the queue is unfiltered.
 */
export const visibleTypeSections = ({
  groups,
  isFilterActive,
  riskScoreByDiscovery,
}: VisibleTypeSectionsArgs): readonly TypeSectionModel[] => {
  const sections = proposalsByCategory({ groups, riskScoreByDiscovery }).map(
    ({ action, label, proposals }) => ({
      action,
      count: proposals.length,
      label,
      proposals,
    })
  );

  return isFilterActive ? sections : sections.filter(({ count }) => count > 0);
};
