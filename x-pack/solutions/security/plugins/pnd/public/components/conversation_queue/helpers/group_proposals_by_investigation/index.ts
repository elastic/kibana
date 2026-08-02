/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalGroup, PndProposalRow } from '@kbn/pnd-common';

import { comparePendingProposals } from '../compare_pending_proposals';
import { readInvestigationId } from '../read_investigation_id';

/**
 * The key of the one group that is not an investigation.
 *
 * Deliberately not a valid Attack Discovery alert id — those are UUIDs — so it can share the key space
 * with real investigations without a prefix scheme, and a DOM id or `data-test-subj` built from it is
 * unmistakable in a snapshot.
 */
export const NO_INVESTIGATION_GROUP_KEY = '__pndNoInvestigation__';

export interface PndInvestigationGroup {
  /**
   * The investigation every member belongs to — its Attack Discovery alert id, which is the identity
   * of the investigation itself (see {@link readInvestigationId}). Absent on the container-less group,
   * which is what distinguishes it: `undefined` means *no investigation*, never *an investigation with
   * no id*.
   */
  correlationId?: string;
  /** Addresses the group in the DOM. The investigation's id, or {@link NO_INVESTIGATION_GROUP_KEY}. */
  key: string;
  /** Ordered by {@link comparePendingProposals}; never empty — a group exists because it has rows. */
  proposals: readonly PndProposalRow[];
}

export interface GroupProposalsByInvestigationParams {
  /**
   * The response's groups, after the page's filters. **Sparse and bucketed by recommended action** —
   * that is the wire contract of `GET /internal/pnd/proposals` and it does not change here; the rows
   * are lifted out of it and regrouped.
   */
  groups: readonly PndProposalGroup[];
  /** The per-discovery risk scores the order leads with. @see {@link comparePendingProposals} */
  riskScoreByDiscovery?: ReadonlyMap<string, number>;
}

/**
 * Regroups the queue **by parent investigation**, with one honest group for the proposals that do not
 * have one yet (decision D7, 2026-08-17 Experience/UX sync: *"Queue is grouped by investigation for
 * MVP (this is the main designed view). Grouping by type/thread is least-prioritized / post-MVP"*).
 *
 * The route still groups by `RecommendedAction` and still should: that is the axis the *server* buckets
 * on, the four counts the KPI tiles read, and the shape both proposal routes share. What changed is
 * the axis the **queue** draws, so this takes the sparse four-bucket payload apart and puts it back
 * together along the container.
 *
 * **The container-less group is ours, not the design's** — see register `#46`. `await_open_investigation`
 * is the lane's first gate and it parks before the investigation exists, so "a proposal with no
 * container" is the normal state of a fresh discovery rather than an error. Neither the prototype nor
 * upstream has an equivalent, because neither has an engine that can produce one.
 *
 * Two properties worth relying on:
 *
 * - **Nothing is dropped and nothing is invented.** Every row of every group reaches exactly one group
 *   here, including an action the response split across two groups (the contract is one group per
 *   action; losing rows from an approval queue is the wrong way to find out that changed) and including
 *   a row whose gate the registry does not know.
 * - **The order is total, at both levels.** Rows are sorted once, and a group's position is its leading
 *   row's — so "the riskiest investigation first, and inside it the most consequential gate first" is
 *   one rule rather than two that agree until they don't. The container-less group takes its place in
 *   that same order rather than being pinned to an end: it holds the *newest* discoveries, and burying
 *   a critical one under every investigation already open would be the opposite of a priority queue.
 */
export const groupProposalsByInvestigation = ({
  groups,
  riskScoreByDiscovery,
}: GroupProposalsByInvestigationParams): readonly PndInvestigationGroup[] => {
  const proposals = groups
    .flatMap(({ proposals: rows }) => rows)
    .sort(comparePendingProposals({ riskScoreByDiscovery }));

  const keyOf = (proposal: PndProposalRow): string =>
    readInvestigationId(proposal) ?? NO_INVESTIGATION_GROUP_KEY;

  // A Set to keep first-appearance order — which, over the sorted rows above, *is* the group order.
  const keys = [...new Set(proposals.map(keyOf))];

  return keys.map((key) => ({
    ...(key === NO_INVESTIGATION_GROUP_KEY ? {} : { correlationId: key }),
    key,
    proposals: proposals.filter((proposal) => keyOf(proposal) === key),
  }));
};
