/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/public';
import { API_VERSIONS as ENTITY_STORE_API_VERSIONS } from '@kbn/entity-store/common';
import type {
  GetEntityStoreStatusResponse,
  InitEntityStoreResponse,
  SetupSystemEventsResponse,
} from '@kbn/entity-store/common';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type {
  StartEntityEngineResponse,
  StopEntityEngineResponse,
} from '../../../common/api/entity_analytics';
import { API_VERSIONS } from '../../../common/entity_analytics/constants';
import { WATCHLISTS_PREBUILT_INSTALL_URL } from '../../../common/entity_analytics/watchlists/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import * as entityAnalyticsI18n from '../translations';

const WATCHLIST_TOAST_LIFETIME_MS = 8000;

export const useEntityStoreRoutes = () => {
  const { http, notifications } = useKibana().services;

  return useMemo(() => {
    const installPrebuiltWatchlists = async (context?: KibanaExecutionContext) =>
      http.fetch<{ acknowledged: boolean }>(WATCHLISTS_PREBUILT_INSTALL_URL, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        context,
      });

    // This is here while waiting for unified installs https://github.com/elastic/security-team/issues/16607
    const tryInstallPrebuiltWatchlistsWithToast = async (context?: KibanaExecutionContext) => {
      try {
        await installPrebuiltWatchlists(context);
      } catch {
        notifications?.toasts?.addWarning({
          title: entityAnalyticsI18n.ENTITY_STORE_PREBUILT_WATCHLISTS_WARNING_TITLE,
          text: entityAnalyticsI18n.ENTITY_STORE_PREBUILT_WATCHLISTS_WARNING_TEXT,
          toastLifeTimeMs: WATCHLIST_TOAST_LIFETIME_MS,
        });
      }
    };

    const getEntityStoreStatus = async (withComponents = false, context?: KibanaExecutionContext) =>
      http.fetch<GetEntityStoreStatusResponse>(ENTITY_STORE_ROUTES.public.STATUS, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: { include_components: withComponents },
        context,
      });

    const installEntityStore = async (context?: KibanaExecutionContext) => {
      await tryInstallPrebuiltWatchlistsWithToast(context);
      return http.fetch<InitEntityStoreResponse>(ENTITY_STORE_ROUTES.public.INSTALL, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
        context,
      });
    };

    const startEntityStore = async (context?: KibanaExecutionContext) => {
      await tryInstallPrebuiltWatchlistsWithToast(context);
      return http.fetch<StartEntityEngineResponse>(ENTITY_STORE_ROUTES.public.START, {
        method: 'PUT',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
        context,
      });
    };

    const stopEntityStore = async (context?: KibanaExecutionContext) =>
      http.fetch<StopEntityEngineResponse>(ENTITY_STORE_ROUTES.public.STOP, {
        method: 'PUT',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
        context,
      });

    const deleteEntityStore = async (context?: KibanaExecutionContext) =>
      http.fetch(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
        context,
      });

    /** Installs the run history streams and dashboard if missing. Needs only read access. */
    const setupSystemEvents = async () =>
      http.fetch<SetupSystemEventsResponse>(ENTITY_STORE_ROUTES.internal.SYSTEM_EVENTS_SETUP, {
        method: 'POST',
        version: ENTITY_STORE_API_VERSIONS.internal.v2,
      });

    return {
      getEntityStoreStatus,
      setupSystemEvents,
      installEntityStore,
      startEntityStore,
      stopEntityStore,
      deleteEntityStore,
    };
  }, [http, notifications]);
};
