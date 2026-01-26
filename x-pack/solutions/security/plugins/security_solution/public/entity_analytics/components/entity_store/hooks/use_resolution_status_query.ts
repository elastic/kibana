/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { GetResolutionStatusResponse } from '../../../../../common/api/entity_analytics/entity_store/resolution/get_resolution_status.gen';
import { useEntityStoreRoutes } from '../../../api/entity_store';

const ENTITY_RESOLUTION_STATUS = 'ENTITY_RESOLUTION_STATUS';

export interface UseResolutionStatusQueryParams {
  entityType: EntityType;
  entityId: string;
  enabled: boolean;
}

export const useResolutionStatusQuery = (params: UseResolutionStatusQueryParams) => {
  const { enabled, entityType, entityId } = params;
  const { getResolutionStatus } = useEntityStoreRoutes();

  return useQuery<GetResolutionStatusResponse | null, IHttpFetchError>({
    queryKey: [ENTITY_RESOLUTION_STATUS, entityType, entityId],
    queryFn: () => getResolutionStatus({ entityType, entityId }),
    cacheTime: 60000, // Cache for 1 minute
    enabled,
    refetchOnWindowFocus: false,
  });
};
