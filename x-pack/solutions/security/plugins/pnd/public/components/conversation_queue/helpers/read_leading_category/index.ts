/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_QUEUE_CATEGORIES } from '@kbn/pnd-common';
import type { PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

/**
 * The most consequential recommended action a group is waiting on, in `CONVERSATION_QUEUE_CATEGORIES`
 * order: contain → escalate → investigate → tune.
 *
 * This is what keeps the four categories meaningful now that they are no longer the grouping key (D7):
 * a group of proposals belonging to one investigation can hold two phases at once — containment on the
 * Watch Floor and tuning on the Post-Incident Watch — and the group's accent says which of them is the
 * one that matters. Read off the shared array rather than a literal, so the accent and the row order
 * (`comparePendingProposals`) can never disagree about which phase leads.
 *
 * `undefined` only for an empty group, which the grouping helper never produces: a group exists because
 * it has rows. It is expressed rather than asserted away so a caller renders no accent instead of the
 * wrong one.
 */
export const readLeadingCategory = ({
  proposals,
}: {
  proposals: readonly PndProposalRow[];
}): RecommendedAction | undefined =>
  CONVERSATION_QUEUE_CATEGORIES.find(({ id }) =>
    proposals.some(({ recommendedAction }) => recommendedAction === id)
  )?.id;
