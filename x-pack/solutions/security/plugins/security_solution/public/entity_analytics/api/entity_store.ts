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
import { WATCHLISTS_PREBUILT_INSTALL_URL } from '../../../common/entity_analytics/watchlists/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import * as entityAnalyticsI18n from '../translations';

const WATCHLIST_TOAST_LIFETIME_MS = 8000;

export const useEntityStoreRoutes = () => {
  const { http, uiSettings, notifications } = useKibana().services;
  const isV2Enabled = uiSettings.get<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  return useMemo(() => {
    const installPrebuiltWatchlists = async () =>
      http.fetch<{ acknowledged: boolean }>(WATCHLISTS_PREBUILT_INSTALL_URL, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
      });

    // This is here while waiting for unified installs https://github.com/elastic/security-team/issues/16607
    const tryInstallPrebuiltWatchlistsWithToast = async () => {
      try {
        await installPrebuiltWatchlists();
      } catch {
        notifications?.toasts?.addWarning({
          title: entityAnalyticsI18n.ENTITY_STORE_PREBUILT_WATCHLISTS_WARNING_TITLE,
          text: entityAnalyticsI18n.ENTITY_STORE_PREBUILT_WATCHLISTS_WARNING_TEXT,
          toastLifeTimeMs: WATCHLIST_TOAST_LIFETIME_MS,
        });
      }
    };

    const getEntityStoreStatus = async (withComponents = false) => {
      if (isV2Enabled) {
        return http.fetch<GetEntityStoreStatusResponse>(ENTITY_STORE_ROUTES.public.STATUS, {
          method: 'GET',
          version: API_VERSIONS.public.v1,
          query: { include_components: withComponents },
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
        await tryInstallPrebuiltWatchlistsWithToast();
        return http.fetch<InitEntityStoreResponse>(ENTITY_STORE_ROUTES.public.INSTALL, {
          method: 'POST',
          version: API_VERSIONS.public.v1,
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
        await tryInstallPrebuiltWatchlistsWithToast();
        return http.fetch<StartEntityEngineResponse>(ENTITY_STORE_ROUTES.public.START, {
          method: 'PUT',
          version: API_VERSIONS.public.v1,
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
        return http.fetch<StopEntityEngineResponse>(ENTITY_STORE_ROUTES.public.STOP, {
          method: 'PUT',
          version: API_VERSIONS.public.v1,
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
        return http.fetch(ENTITY_STORE_ROUTES.public.UNINSTALL, {
          method: 'POST',
          version: API_VERSIONS.public.v1,
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
  }, [http, isV2Enabled, notifications]);
};
