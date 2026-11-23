/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRetryableIncompleteReason } from '../common/completeness';
import { MAX_HUNT_TECHNIQUE_IDS } from '../common/hunt_technique_limit';
import type { HuntBehaviorResult } from './types';

/**
 * The techniques a Tier 2 run settled, so a later run on the same report can spend its generation
 * budget elsewhere. A technique counts when its query executed and repeating it could not say more:
 * either the result says something about the environment (no `inconclusive_reason`), or it is
 * inconclusive for a reason `completeness.ts` classes as final (unclassifiable rows, document refs
 * the query dropped), which a retry would reproduce. A technique also counts when it was
 * `collapsed` onto a sibling, which `huntBehavior` only does once that sibling's query executed
 * conclusively. A technique that failed, was refused, or lost the budget has not been searched and
 * stays out, so it is tried again.
 */
export const getSearchedTechniqueIds = ({
  behaviors,
  incomplete = [],
}: Pick<HuntBehaviorResult, 'behaviors' | 'incomplete'>): string[] => {
  const executed = behaviors
    .filter(
      ({ execution }) =>
        execution?.executed === true &&
        (!execution.inconclusive_reason ||
          !isRetryableIncompleteReason(execution.inconclusive_reason))
    )
    .map(({ technique_id: techniqueId }) => techniqueId);
  const collapsed = incomplete
    .filter(({ reason, technique_id: techniqueId }) => reason === 'collapsed' && techniqueId)
    .map(({ technique_id: techniqueId }) => techniqueId as string);

  return [...new Set([...executed, ...collapsed])].slice(0, MAX_HUNT_TECHNIQUE_IDS);
};
