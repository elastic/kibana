/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_QUEUE_CATEGORIES } from '@kbn/pnd-common';
import type { PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

/** No score derived for any discovery, as a stable identity for the common caller-has-nothing case. */
const NO_RISK_SCORES: ReadonlyMap<string, number> = new Map();

/**
 * Where a recommended action sits in the incident-response priority, read off
 * `CONVERSATION_QUEUE_CATEGORIES` rather than restated: contain → escalate → investigate → tune.
 *
 * The order *is* the priority (D11), which is why it is imported. A hand-written literal beside it
 * would survive review and then put "tune" above "contain" the day the shared array changed.
 *
 * An action the array does not name ranks last rather than first, which `findIndex`'s own `-1` would
 * do. The enum is closed and the array covers all four of it, so this is unreachable today; it is
 * here so that adding a fifth action lands it at the bottom of a phase rather than at the top of the
 * queue.
 */
const categoryRank = (action: RecommendedAction): number => {
  const rank = CONVERSATION_QUEUE_CATEGORIES.findIndex(({ id }) => id === action);

  return rank === -1 ? CONVERSATION_QUEUE_CATEGORIES.length : rank;
};

/**
 * A score no real one can tie with, so an unscored row sorts **after** a scored zero.
 *
 * `riskScore` is absent — never zero — for a discovery with no constituent alerts, and the two claims
 * are different: a real `0` is a measurement and an absent score is silence (D5). Sorting silence as
 * zero would interleave the two.
 */
const UNSCORED = -1;

export interface ComparePendingProposalsParams {
  /**
   * The D5 max-of-constituent-alerts score per discovery, from the page's single
   * `GET /internal/pnd/discovery-context` read (D10). Omitted when nothing could be enriched, which
   * leaves the order to the tiebreakers below rather than to the response's iteration.
   */
  riskScoreByDiscovery?: ReadonlyMap<string, number>;
}

/**
 * The queue's one ordering rule, as a comparator: **risk, then phase, then age, then id**.
 *
 * It answers for both levels of the grouped queue, because both are the same question asked twice —
 * rows inside a group, and the groups themselves through their leading row. That is deliberately
 * upstream's shape ([#284440](https://github.com/elastic/kibana/pull/284440) sorted its queue by
 * `Investigation.priorityScore` then `updatedAt`) mapped onto what a `PndProposalRow` really carries:
 *
 * 1. **Risk descending.** `priorityScore` is a field of the mock `Investigation` and no live object has
 *    one, so the nearest real signal is the derived risk score the page already reads for every row's
 *    badge. Unscored rows sort last — see {@link UNSCORED}.
 * 2. **Phase, in `CONVERSATION_QUEUE_CATEGORIES` order.** What decides between two gates of one
 *    investigation, which share a discovery and therefore share a score: containment outranks tuning
 *    for the same reason the sections used to be drawn in that order.
 * 3. **Oldest first.** The gate that has been waiting longest is the one waiting longest. ISO 8601 UTC
 *    timestamps — which is what `createdAt` is, server-stamped — compare lexicographically, so this
 *    needs no parse and cannot produce a `NaN` ordering for a malformed one.
 * 4. **`sourceId` ascending.** Not a preference, a **guarantee**: `sourceId` is unique per pending gate
 *    (`workflowId:workflowRunId:stepExecutionId`), so the comparator is a *total* order and two rows
 *    can never tie. Without it, `Array.prototype.sort` stability would be the only thing keeping a
 *    poll from reshuffling the queue under the analyst's cursor, and stability across two different
 *    input orders is not something it promises.
 */
export const comparePendingProposals =
  ({ riskScoreByDiscovery = NO_RISK_SCORES }: ComparePendingProposalsParams = {}) =>
  (a: PndProposalRow, b: PndProposalRow): number => {
    const riskOf = ({ correlationId }: PndProposalRow): number =>
      riskScoreByDiscovery.get(correlationId) ?? UNSCORED;

    const byRisk = riskOf(b) - riskOf(a);
    if (byRisk !== 0) {
      return byRisk;
    }

    const byPhase = categoryRank(a.recommendedAction) - categoryRank(b.recommendedAction);
    if (byPhase !== 0) {
      return byPhase;
    }

    const byAge = a.createdAt.localeCompare(b.createdAt);
    if (byAge !== 0) {
      return byAge;
    }

    return a.sourceId.localeCompare(b.sourceId);
  };
