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

export const useDashboardsApi = (name?: string) => {
  const { signal } = useAbortController();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const addDashboards = useCallback(
    async (dashboards: SanitizedDashboardAsset[]) => {
      if (!name) {
        return;
      }

      await streamsRepositoryClient.fetch('POST /api/streams/{name}/dashboards/_bulk', {
        signal,
        params: {
          path: {
            name,
          },
          body: {
            operations: dashboards.map((dashboard) => {
              return { index: { id: dashboard.id } };
            }),
          },
        },
      });
    },
    [name, signal, streamsRepositoryClient]
  );

  const removeDashboards = useCallback(
    async (dashboards: SanitizedDashboardAsset[]) => {
      if (!name) {
        return;
      }
      await streamsRepositoryClient.fetch('POST /api/streams/{name}/dashboards/_bulk', {
        signal,
        params: {
          path: {
            name,
          },
          body: {
            operations: dashboards.map((dashboard) => {
              return { delete: { id: dashboard.id } };
            }),
          },
        },
      });
    },
    [name, signal, streamsRepositoryClient]
  );

  return {
    addDashboards,
    removeDashboards,
  };
};
