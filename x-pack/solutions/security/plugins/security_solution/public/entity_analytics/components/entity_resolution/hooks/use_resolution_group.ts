/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/public';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

export const RESOLUTION_GROUP_ROUTE = ENTITY_STORE_ROUTES.public.RESOLUTION_GROUP;
export const RESOLUTION_GROUP_QUERY_KEY = 'resolution-group';

export interface ResolutionGroup {
  target: Record<string, unknown>;
  aliases: Array<Record<string, unknown>>;
  group_size: number;
}

interface UseResolutionGroupOptions {
  enabled?: boolean;
}

export const useResolutionGroup = (entityId: string, options?: UseResolutionGroupOptions) => {
  const { http } = useKibana().services;

  return useQuery<ResolutionGroup, IHttpFetchError>({
    queryKey: [RESOLUTION_GROUP_QUERY_KEY, entityId],
    queryFn: () =>
      http.fetch<ResolutionGroup>(RESOLUTION_GROUP_ROUTE, {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: { entity_id: entityId },
      }),
    enabled: options?.enabled !== false && !!entityId,
    refetchOnWindowFocus: false,
  });
};
