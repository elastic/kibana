/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { getScheduledIndexPattern } from '@kbn/attack-discovery-schedules-common';

/**
 * Builds the search that resolves one persisted Attack Discovery by its document id, across
 * both the scheduled and the ad-hoc indices of the space.
 *
 * `origin` is the document `_id`, which equals `kibana.alert.uuid`, so either clause finds it.
 */
export const getResolveSearchRequest = ({
  adhocIndex,
  origin,
  spaceId,
}: {
  adhocIndex: string;
  origin: string;
  spaceId: string;
}): estypes.SearchRequest => ({
  allow_no_indices: true,
  ignore_unavailable: true,
  index: [getScheduledIndexPattern(spaceId), adhocIndex].join(','),
  query: {
    bool: {
      minimum_should_match: 1,
      should: [{ ids: { values: [origin] } }, { term: { 'kibana.alert.uuid': origin } }],
    },
  },
  size: 1,
});
