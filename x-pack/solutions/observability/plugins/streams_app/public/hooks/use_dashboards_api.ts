/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useDashboardsApi = (id?: string) => {
  const { signal } = useAbortController();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const dashboardsFetch = useStreamsAppFetch(() => {
    if (!id) {
      return Promise.resolve(undefined);
    }
    return streamsRepositoryClient.fetch('GET /api/streams/{id}/dashboards', {
      signal,
      params: {
        path: {
          id,
        },
      },
    });
  }, [id, signal, streamsRepositoryClient]);

  const addDashboards = useCallback(
    async (dashboards: SanitizedDashboardAsset[]) => {
      if (!id) {
        return;
      }

      await streamsRepositoryClient.fetch('POST /api/streams/{id}/dashboards/_bulk', {
        signal,
        params: {
          path: {
            id,
          },
          body: {
            operations: dashboards.map((dashboard) => {
              return { create: { id: dashboard.id } };
            }),
          },
        },
      });

      await dashboardsFetch.refresh();
    },
    [dashboardsFetch, id, signal, streamsRepositoryClient]
  );

  const removeDashboards = useCallback(
    async (dashboards: SanitizedDashboardAsset[]) => {
      if (!id) {
        return;
      }
      await streamsRepositoryClient.fetch('POST /api/streams/{id}/dashboards/_bulk', {
        signal,
        params: {
          path: {
            id,
          },
          body: {
            operations: dashboards.map((dashboard) => {
              return { delete: { id: dashboard.id } };
            }),
          },
        },
      });

      await dashboardsFetch.refresh();
    },
    [dashboardsFetch, id, signal, streamsRepositoryClient]
  );

  return {
    dashboardsFetch,
    addDashboards,
    removeDashboards,
  };
};
