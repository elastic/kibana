/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useDashboardsFetch = (id?: string) => {
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

  return dashboardsFetch;
};
