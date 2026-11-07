/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import type { IntelligenceEntity } from '../common';
import { toIntelligenceEntity } from '../common';

interface UseIntelligenceEntityListParams {
  entityTypes?: EntityType[];
  filterQuery?: string;
  perPage?: number;
  enabled?: boolean;
}

const DEFAULT_ENTITY_TYPES = [EntityType.user, EntityType.host, EntityType.service];

/**
 * Fetches entities from the Entity Store sorted by normalized risk score
 * (descending) and flattens them for the intelligence page lists.
 */
export const useIntelligenceEntityList = ({
  entityTypes = DEFAULT_ENTITY_TYPES,
  filterQuery,
  perPage = 10,
  enabled = true,
}: UseIntelligenceEntityListParams) => {
  const { fetchEntitiesListV2 } = useEntityAnalyticsRoutes();
  const spaceId = useSpaceId();

  const { data, isLoading, isError, isFetching, refetch } = useQuery(
    ['entityIntelligenceEntityList', spaceId, entityTypes, filterQuery, perPage],
    ({ signal }) =>
      fetchEntitiesListV2({
        signal,
        params: {
          entityTypes,
          sortField: 'entity.risk.calculated_score_norm',
          sortOrder: 'desc',
          page: 1,
          perPage,
          ...(filterQuery ? { filterQuery } : {}),
        },
      }),
    { enabled: enabled && Boolean(spaceId), refetchOnWindowFocus: false, retry: 1 }
  );

  const entities = useMemo<IntelligenceEntity[]>(
    () =>
      (!isError && spaceId ? data?.records ?? [] : [])
        .map(toIntelligenceEntity)
        .filter((entity): entity is IntelligenceEntity => entity !== undefined),
    [data?.records, isError, spaceId]
  );

  return {
    entities,
    total: !isError && spaceId ? data?.total ?? 0 : 0,
    isLoading: enabled && Boolean(spaceId) && isLoading,
    isError,
    isRefreshing: isFetching,
    refetch,
  };
};
