/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/common';
import type { GetEntityStoreStatusResponse } from '../../../../../common/api/entity_analytics/entity_store/status.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

const ENTITY_STORE_V2_STATUS = ['GET', 'ENTITY_STORE_V2_STATUS'];

/**
 * Hook to fetch Entity Store v2 status.
 * Calls `GET /internal/security/entity_store/status?apiVersion=2`.
 * Treats errors gracefully (v2 disabled → not running).
 */
export const useEntityStoreV2Status = () => {
  const { http } = useKibana().services;

  return useQuery<GetEntityStoreStatusResponse, IHttpFetchError>({
    queryKey: ENTITY_STORE_V2_STATUS,
    queryFn: () =>
      http.fetch<GetEntityStoreStatusResponse>(ENTITY_STORE_ROUTES.STATUS, {
        method: 'GET',
        query: { apiVersion: '2', include_components: false },
      }),
    retry: false,
  });
};
