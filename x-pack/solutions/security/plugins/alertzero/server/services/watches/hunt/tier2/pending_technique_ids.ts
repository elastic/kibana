/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntIncompleteReason } from '@kbn/alertzero-common';
import { isRetryableIncompleteReason } from '../common/completeness';
import { MAX_HUNT_TECHNIQUE_IDS } from '../common/hunt_technique_limit';
import { getSearchedTechniqueIds } from './searched_technique_ids';
import type { HuntBehaviorResult } from './types';

/**
 * The techniques a Tier 2 run could not search but a later run still should: the ones named by a
 * gap that `completeness.ts` classes as retryable. The caller records them on the report, so the next
 * run keeps them as pending work even when its own extraction no longer returns them.
 *
 * A technique this run did search is never pending, even when another candidate for the same id
 * left a gap (an ungrounded quote next to a grounded one). `treatAsFinal` carries the reasons the
 * coordinator has already ruled deterministic for this run, so the list agrees with `completeness`.
 */
export const getPendingTechniqueIds = (
  { behaviors, incomplete = [] }: Pick<HuntBehaviorResult, 'behaviors' | 'incomplete'>,
  { treatAsFinal }: { treatAsFinal?: ReadonlySet<HuntIncompleteReason> } = {}
): string[] => {
  const searched = new Set(getSearchedTechniqueIds({ behaviors, incomplete }));

  return [
    ...new Set(
      incomplete
        .filter(
          ({ reason, technique_id: techniqueId }) =>
            techniqueId &&
            isRetryableIncompleteReason(reason) &&
            !treatAsFinal?.has(reason) &&
            !searched.has(techniqueId)
        )
        .map(({ technique_id: techniqueId }) => techniqueId as string)
    ),
  ].slice(0, MAX_HUNT_TECHNIQUE_IDS);
};
