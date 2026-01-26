/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { UnlinkEntitiesResponse } from '../../../../../common/api/entity_analytics/entity_store/resolution/unlink_entities.gen';
import { useEntityStoreRoutes } from '../../../api/entity_store';

const ENTITY_STORE_SECONDARIES = 'ENTITY_STORE_SECONDARIES';
const ENTITY_STORE_PRIMARIES = 'ENTITY_STORE_PRIMARIES';

export interface UseUnlinkEntitiesMutationParams {
  entityType: EntityType;
}

export const useUnlinkEntitiesMutation = (params: UseUnlinkEntitiesMutationParams) => {
  const { entityType } = params;
  const { unlinkEntities } = useEntityStoreRoutes();
  const queryClient = useQueryClient();

  return useMutation<UnlinkEntitiesResponse, IHttpFetchError, { entityIds: string[] }>({
    mutationFn: ({ entityIds }) => unlinkEntities({ entityType, entityIds }),
    onSuccess: () => {
      // Invalidate both primaries and secondaries queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [ENTITY_STORE_SECONDARIES] });
      queryClient.invalidateQueries({ queryKey: [ENTITY_STORE_PRIMARIES] });
    },
  });
};
