/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from '../../../../common/lib/kibana';
import {
  getEntitiesAlias,
  ENTITY_LATEST,
} from '../../../../entity_analytics/components/home/constants';

interface MaxAggResponse {
  latest_update: estypes.AggregationsMaxAggregate;
}

type LastSeenRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LastSeenResponse = IKibanaSearchResponse<estypes.SearchResponse<never, MaxAggResponse>>;

/**
 * Fetches the most recent `entity.lifecycle.last_seen` timestamp across a set
 * of entities. Uses a `max` aggregation (size 0) so no documents are returned —
 * this is a read-only, lightweight staleness check.
 *
 * Intended for use in the cases entity attachment tab when the Entity Store is
 * `stopped` (data persists but is no longer updated) to give the user an idea
 * of how stale the displayed entities are.
 */
export const useEntityLastSeen = ({
  entityIds,
  spaceId,
  enabled = true,
}: {
  entityIds: string[];
  spaceId: string | undefined;
  enabled?: boolean;
}) => {
  const { data } = useKibana().services;

  return useQuery({
    queryKey: ['entity_last_seen', entityIds, spaceId],
    enabled: enabled && !!spaceId && entityIds.length > 0,
    queryFn: async (): Promise<string | null> => {
      if (!spaceId) {
        return null;
      }
      const index = getEntitiesAlias(ENTITY_LATEST, spaceId);

      const { rawResponse } = await lastValueFrom(
        data.search.search<LastSeenRequest, LastSeenResponse>({
          params: {
            index: [index],
            size: 0,
            ignore_unavailable: true,
            query: {
              terms: { 'entity.id': entityIds },
            },
            aggs: {
              latest_update: {
                max: { field: 'entity.lifecycle.last_seen' },
              },
            },
          },
        })
      );

      const value = rawResponse.aggregations?.latest_update?.value_as_string ?? null;
      return value;
    },
  });
};
