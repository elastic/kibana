/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { EntityType as EntityStoreEntityType } from '@kbn/entity-store/public';
import { FF_ENABLE_ENTITY_STORE_V2, searchEntitiesFromEntityStore } from '@kbn/entity-store/public';
import type { ListEntitiesResponse } from '../../../../../common/api/entity_analytics/entity_store/entities/list_entities.gen';
import type { FetchEntitiesListParams } from '../../../api/api';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useKibana, useUiSetting } from '../../../../common/lib/kibana';

const ENTITY_STORE_ENTITIES_LIST = 'ENTITY_STORE_ENTITIES_LIST';

interface UseEntitiesListParams extends FetchEntitiesListParams {
  skip: boolean;
}

export const useEntitiesListQuery = (params: UseEntitiesListParams) => {
  const { skip, ...fetchParams } = params;
  const { fetchEntitiesList } = useEntityAnalyticsRoutes();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const {
    services: { http },
  } = useKibana();

  return useQuery<ListEntitiesResponse | null, IHttpFetchError>({
    queryKey: [ENTITY_STORE_ENTITIES_LIST, fetchParams, entityStoreV2Enabled],
    queryFn: async ({ signal }) => {
      if (entityStoreV2Enabled) {
        const v2Response = await searchEntitiesFromEntityStore(
          http,
          {
            entityTypes: fetchParams.entityTypes as EntityStoreEntityType[],
            filterQuery: fetchParams.filterQuery,
            page: fetchParams.page ?? 1,
            perPage: fetchParams.perPage ?? 20,
            sortField: fetchParams.sortField,
            sortOrder: fetchParams.sortOrder,
          },
          { signal }
        );
        return v2Response as ListEntitiesResponse;
      }
      return fetchEntitiesList({ signal, params: fetchParams });
    },
    cacheTime: 0,
    enabled: !skip,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
