/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { KibanaServices } from '../../common/lib/kibana';

/**
 * Index pattern covering the scheduled and adhoc attack discovery alerts of a space.
 */
export const getAttackIndexPattern = (spaceId: string): string =>
  [ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX, ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX]
    .map((prefix) => `${prefix}-${spaceId}`)
    .join(',');

/**
 * This checks whether that `_id` belongs to an attack discovery alert in the given space
 *
 * Kept as cheap as possible: only the two attack indices are searched, no field is fetched and the
 * search stops at the first hit.
 *
 * Returns `true` if the `_id` is an attack, `false` if it is an alert or an event.
 */
export const fetchIsAttack = async ({
  eventId,
  spaceId,
}: {
  eventId: string;
  spaceId: string;
}): Promise<boolean> => {
  const response = await lastValueFrom(
    KibanaServices.get().data.search.search({
      params: {
        index: getAttackIndexPattern(spaceId),
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 1,
        _source: false,
        terminate_after: 1,
        track_total_hits: false,
        query: { ids: { values: [eventId] } },
      },
    })
  );

  return (response?.rawResponse?.hits?.hits?.length ?? 0) > 0;
};
