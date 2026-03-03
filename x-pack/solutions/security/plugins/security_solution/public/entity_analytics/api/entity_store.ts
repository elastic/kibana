/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/public';
import type { GetEntityStoreStatusResponse } from '../../../common/api/entity_analytics/entity_store/status.gen';
import type {
  InitEntityStoreRequestBodyInput,
  InitEntityStoreResponse,
} from '../../../common/api/entity_analytics/entity_store/enable.gen';
import type {
  DeleteEntityEngineResponse,
  EntityType,
  InitEntityEngineResponse,
  ListEntityEnginesResponse,
  StartEntityEngineResponse,
  StopEntityEngineResponse,
  StoreStatus,
} from '../../../common/api/entity_analytics';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';

const ENTITY_STORE_V2_QUERY = { apiVersion: '2' } as const;

export const useEntityStoreRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const enableEntityStore = async (options: InitEntityStoreRequestBodyInput = {}) => {
      return http.fetch<InitEntityStoreResponse>('/api/entity_store/enable', {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify(options),
      });
    };

    const getEntityStoreStatus = async (withComponents = false) => {
      return http.fetch<GetEntityStoreStatusResponse>('/api/entity_store/status', {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: { include_components: withComponents },
      });
    };

    const initEntityEngine = async (entityType: EntityType) => {
      return http.fetch<InitEntityEngineResponse>(`/api/entity_store/engines/${entityType}/init`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const stopEntityEngine = async (entityType: EntityType) => {
      return http.fetch<StopEntityEngineResponse>(`/api/entity_store/engines/${entityType}/stop`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const startEntityEngine = async (entityType: EntityType) => {
      return http.fetch<StartEntityEngineResponse>(
        `/api/entity_store/engines/${entityType}/start`,
        {
          method: 'POST',
          version: API_VERSIONS.public.v1,
          body: JSON.stringify({}),
        }
      );
    };

    const deleteEntityEngine = async (entityType: EntityType, deleteData: boolean) => {
      return http.fetch<DeleteEntityEngineResponse>(`/api/entity_store/engines/${entityType}`, {
        method: 'DELETE',
        query: { data: deleteData },
        version: API_VERSIONS.public.v1,
      });
    };

    const listEntityEngines = async () => {
      return http.fetch<ListEntityEnginesResponse>(`/api/entity_store/engines`, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
      });
    };

    const getEntityStoreStatusV2 = async (withComponents = false) => {
      return http.fetch<{ status: StoreStatus; engines: unknown[] }>(ENTITY_STORE_ROUTES.STATUS, {
        method: 'GET',
        query: { ...ENTITY_STORE_V2_QUERY, include_components: withComponents },
      });
    };

    const installEntityStoreV2 = async () => {
      return http.fetch(ENTITY_STORE_ROUTES.INSTALL, {
        method: 'POST',
        query: ENTITY_STORE_V2_QUERY,
        body: JSON.stringify({}),
      });
    };

    const startEntityStoreV2 = async () => {
      return http.fetch(ENTITY_STORE_ROUTES.START, {
        method: 'PUT',
        query: ENTITY_STORE_V2_QUERY,
        body: JSON.stringify({}),
      });
    };

    const stopEntityStoreV2 = async () => {
      return http.fetch(ENTITY_STORE_ROUTES.STOP, {
        method: 'PUT',
        query: ENTITY_STORE_V2_QUERY,
        body: JSON.stringify({}),
      });
    };

    return {
      enableEntityStore,
      getEntityStoreStatus,
      initEntityEngine,
      startEntityEngine,
      stopEntityEngine,
      deleteEntityEngine,
      listEntityEngines,
      getEntityStoreStatusV2,
      installEntityStoreV2,
      startEntityStoreV2,
      stopEntityStoreV2,
    };
  }, [http]);
};
