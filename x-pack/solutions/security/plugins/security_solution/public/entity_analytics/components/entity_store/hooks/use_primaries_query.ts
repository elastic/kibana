/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { ListPrimaryEntitiesResponse } from '../../../../../common/api/entity_analytics/entity_store/resolution/list_primaries.gen';
import { useEntityStoreRoutes } from '../../../api/entity_store';

const ENTITY_STORE_PRIMARIES = 'ENTITY_STORE_PRIMARIES';

export interface UsePrimariesQueryParams {
  entityType: EntityType;
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  filterQuery?: string;
  skip: boolean;
}

export const usePrimariesQuery = (params: UsePrimariesQueryParams) => {
  const { skip, ...fetchParams } = params;
  const { listPrimaryEntities } = useEntityStoreRoutes();

  return useQuery<ListPrimaryEntitiesResponse | null, IHttpFetchError>({
    queryKey: [ENTITY_STORE_PRIMARIES, fetchParams],
    queryFn: () => listPrimaryEntities(fetchParams),
    cacheTime: 0,
    enabled: !skip,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
