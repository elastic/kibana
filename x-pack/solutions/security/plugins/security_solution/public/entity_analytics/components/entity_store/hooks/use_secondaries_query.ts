/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { ListSecondaryEntitiesResponse } from '../../../../../common/api/entity_analytics/entity_store/resolution/list_secondaries.gen';
import { useEntityStoreRoutes } from '../../../api/entity_store';

const ENTITY_STORE_SECONDARIES = 'ENTITY_STORE_SECONDARIES';

export interface UseSecondariesQueryParams {
  entityType: EntityType;
  primaryEntityId: string;
  enabled: boolean;
}

export const useSecondariesQuery = (params: UseSecondariesQueryParams) => {
  const { enabled, entityType, primaryEntityId } = params;
  const { listSecondaryEntities } = useEntityStoreRoutes();

  return useQuery<ListSecondaryEntitiesResponse | null, IHttpFetchError>({
    queryKey: [ENTITY_STORE_SECONDARIES, entityType, primaryEntityId],
    queryFn: () => listSecondaryEntities({ entityType, primaryEntityId }),
    cacheTime: 0,
    enabled,
    refetchOnWindowFocus: false,
  });
};
