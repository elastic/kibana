/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

/** Every recommended action, mapped to the rows filed under it. */
export type ProposalsByAction = Readonly<Record<RecommendedAction, readonly PndProposalRow[]>>;

/** Four empty buckets — the shape the tiles render when a filter excludes everything. */
const emptyBuckets = (): Record<RecommendedAction, readonly PndProposalRow[]> => ({
  contain: [],
  escalate: [],
  investigate: [],
  tune: [],
});

/**
 * Turns the response's *sparse* list of groups into a **total** map over the four recommended
 * actions.
 *
 * This is what lets {@link ProposalKpiTiles} draw a tile for a bucket the response never mentioned:
 * four tiles render whenever anything is on screen (or a filter is active), including a zero for
 * a phase with no pending action, so an analyst reads "nothing to contain" as a fact rather than as
 * a phase that might be waiting somewhere off screen. The route only sends buckets that have rows,
 * and the filters then drop more, so the absent-bucket case is the common one, not the exceptional
 * one.
 *
 * Rows are **concatenated** rather than assigned, so a response that ever split one action across
 * two groups counts every row instead of silently losing all but the last. The contract is one
 * group per action; losing rows from a HITL approval queue is the wrong way to find out that changed.
 */
export const groupProposalsByAction = (groups: PndProposalGroup[]): ProposalsByAction =>
  groups.reduce<Record<RecommendedAction, readonly PndProposalRow[]>>(
    (byAction, { proposals, recommendedAction }) => ({
      ...byAction,
      [recommendedAction]: [...byAction[recommendedAction], ...proposals],
    }),
    emptyBuckets()
  );
