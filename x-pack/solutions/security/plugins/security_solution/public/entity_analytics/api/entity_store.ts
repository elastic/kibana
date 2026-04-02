/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { ENTITY_STORE_ROUTES, FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
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
} from '../../../common/api/entity_analytics';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';

const ENTITY_STORE_V2_QUERY = { apiVersion: '2' } as const;

export const useEntityStoreRoutes = () => {
  const { http, uiSettings } = useKibana().services;
  const isV2Enabled = uiSettings.get<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  return useMemo(() => {
    const getEntityStoreStatus = async (withComponents = false) => {
      if (isV2Enabled) {
        return http.fetch<GetEntityStoreStatusResponse>(ENTITY_STORE_ROUTES.STATUS, {
          method: 'GET',
          query: { ...ENTITY_STORE_V2_QUERY, include_components: withComponents },
        });
      }
      return http.fetch<GetEntityStoreStatusResponse>('/api/entity_store/status', {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: { include_components: withComponents },
      });
    };

    const installEntityStore = async (options?: InitEntityStoreRequestBodyInput) => {
      if (isV2Enabled) {
        return http.fetch<InitEntityStoreResponse>(ENTITY_STORE_ROUTES.INSTALL, {
          method: 'POST',
          query: ENTITY_STORE_V2_QUERY,
          body: JSON.stringify({}),
        });
      }
      return http.fetch<InitEntityStoreResponse>('/api/entity_store/enable', {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify(options ?? {}),
      });
    };

    const startEntityStore = async (entityTypes?: EntityType[]) => {
      if (isV2Enabled) {
        return http.fetch<StartEntityEngineResponse>(ENTITY_STORE_ROUTES.START, {
          method: 'PUT',
          query: ENTITY_STORE_V2_QUERY,
          body: JSON.stringify({}),
        });
      }
      if (!entityTypes || entityTypes.length === 0) {
        throw new Error('entityTypes required for v1 API');
      }
      const results = await Promise.all(
        entityTypes.map((entityType) =>
          http.fetch<StartEntityEngineResponse>(`/api/entity_store/engines/${entityType}/start`, {
            method: 'POST',
            version: API_VERSIONS.public.v1,
            body: JSON.stringify({}),
          })
        )
      );
      return results;
    };

    const stopEntityStore = async (entityTypes?: EntityType[]) => {
      if (isV2Enabled) {
        return http.fetch<StopEntityEngineResponse>(ENTITY_STORE_ROUTES.STOP, {
          method: 'PUT',
          query: ENTITY_STORE_V2_QUERY,
          body: JSON.stringify({}),
        });
      }
      if (!entityTypes || entityTypes.length === 0) {
        throw new Error('entityTypes required for v1 API');
      }
      const results = await Promise.all(
        entityTypes.map((entityType) =>
          http.fetch<StopEntityEngineResponse>(`/api/entity_store/engines/${entityType}/stop`, {
            method: 'POST',
            version: API_VERSIONS.public.v1,
            body: JSON.stringify({}),
          })
        )
      );
      return results;
    };

    const deleteEntityStore = async (entityTypes?: EntityType[], deleteData = true) => {
      if (isV2Enabled) {
        return http.fetch(ENTITY_STORE_ROUTES.UNINSTALL, {
          method: 'POST',
          query: ENTITY_STORE_V2_QUERY,
          body: JSON.stringify({}),
        });
      }
      if (!entityTypes || entityTypes.length === 0) {
        throw new Error('entityTypes required for v1 API');
      }
      const results = await Promise.all(
        entityTypes.map((entityType) =>
          http.fetch<DeleteEntityEngineResponse>(`/api/entity_store/engines/${entityType}`, {
            method: 'DELETE',
            query: { data: deleteData },
            version: API_VERSIONS.public.v1,
          })
        )
      );
      return results;
    };

    const initEntityEngine = async (entityType: EntityType) => {
      return http.fetch<InitEntityEngineResponse>(`/api/entity_store/engines/${entityType}/init`, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const listEntityEngines = async () => {
      return http.fetch<ListEntityEnginesResponse>(`/api/entity_store/engines`, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
      });
    };

    return {
      getEntityStoreStatus,
      installEntityStore,
      startEntityStore,
      stopEntityStore,
      deleteEntityStore,
      initEntityEngine,
      listEntityEngines,
    };
  }, [http, isV2Enabled]);
};
