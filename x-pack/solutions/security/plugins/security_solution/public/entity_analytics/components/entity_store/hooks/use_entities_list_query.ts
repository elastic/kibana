/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { EntityType as EntityStoreEntityType } from '@kbn/entity-store/public';
import type { ListEntitiesResponse } from '@kbn/entity-store/common';
import type { FetchEntitiesListParams } from '../../../api/api';
import { useEntityAnalyticsRoutes } from '../../../api/api';

export const ENTITY_STORE_ENTITIES_LIST = 'ENTITY_STORE_ENTITIES_LIST';

interface UseEntitiesListParams extends FetchEntitiesListParams {
  skip: boolean;
  /**
   * Optional Kibana execution context. Forwarded to `fetchEntitiesListV2` so slow logs and APM
   * traces can attribute the query to the caller's page/panel. Callers typically pass a
   * `{ child: { type: 'security_solution', name: '<page>', id: '<panel>' } }` descriptor built via
   * `buildExecutionContext(...)`.
   */
  executionContext?: KibanaExecutionContext;
}

export const useEntitiesListQuery = (params: UseEntitiesListParams) => {
  const { skip, executionContext, ...fetchParams } = params;
  const { fetchEntitiesListV2 } = useEntityAnalyticsRoutes();

  return useQuery<ListEntitiesResponse | null, IHttpFetchError>({
    queryKey: [ENTITY_STORE_ENTITIES_LIST, fetchParams],
    queryFn: async ({ signal }) =>
      fetchEntitiesListV2({
        signal,
        params: {
          ...fetchParams,
          entityTypes: fetchParams.entityTypes as EntityStoreEntityType[],
          page: fetchParams.page ?? 1,
          perPage: fetchParams.perPage ?? 20,
        },
        context: executionContext,
      }),
    cacheTime: 0,
    enabled: !skip,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
