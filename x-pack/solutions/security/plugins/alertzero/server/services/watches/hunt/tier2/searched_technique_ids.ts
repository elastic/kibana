/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntBehaviorResult } from './types';

/** Most technique ids a run reports as searched; matches the contract's `maxItems`. */
export const MAX_SEARCHED_TECHNIQUE_IDS = 100;

/**
 * The techniques a Tier 2 run actually searched, so a later run on the same report can spend
 * its generation budget elsewhere. A technique counts when its query executed and produced a
 * result that says something about the environment (no `inconclusive_reason`), or when it was
 * `collapsed` onto a sibling whose query searched the same artifacts. A technique that failed,
 * was refused, or lost the budget has not been searched and stays out, so it is tried again.
 */
export const getSearchedTechniqueIds = ({
  behaviors,
  incomplete = [],
}: Pick<HuntBehaviorResult, 'behaviors' | 'incomplete'>): string[] => {
  const executed = behaviors
    .filter(({ execution }) => execution?.executed === true && !execution.inconclusive_reason)
    .map(({ technique_id: techniqueId }) => techniqueId);
  const collapsed = incomplete
    .filter(({ reason, technique_id: techniqueId }) => reason === 'collapsed' && techniqueId)
    .map(({ technique_id: techniqueId }) => techniqueId as string);

  return [...new Set([...executed, ...collapsed])].slice(0, MAX_SEARCHED_TECHNIQUE_IDS);
};
