/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RECOMMENDED_ACTIONS, type PndProposalGroup, type PndProposalRow } from '@kbn/pnd-common';

/**
 * Group deduplicated proposal rows into the grouped HITL queue shape the UI renders,
 * one {@link PndProposalGroup} per recommended action that has at least one row.
 *
 * Groups appear in the canonical {@link RECOMMENDED_ACTIONS} order (`contain`,
 * `escalate`, `investigate`, `tune`) so the queue is stable across requests, and
 * within a group rows keep their incoming newest-first order. Empty buckets are
 * omitted so the response never carries more than the four possible groups.
 */
export const groupProposals = (rows: PndProposalRow[]): PndProposalGroup[] =>
  RECOMMENDED_ACTIONS.flatMap((recommendedAction): PndProposalGroup[] => {
    const proposals = rows.filter((row) => row.recommendedAction === recommendedAction);
    return proposals.length > 0 ? [{ proposals, recommendedAction }] : [];
  });
