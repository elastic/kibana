/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useDashboardsFetch = (name?: string) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const dashboardsFetch = useStreamsAppFetch(
    ({ signal }) => {
      if (!name) {
        return Promise.resolve(undefined);
      }
      return streamsRepositoryClient.fetch('GET /api/streams/{name}/dashboards', {
        signal,
        params: {
          path: {
            name,
          },
        },
      });
    },
    [name, streamsRepositoryClient]
  );

  return dashboardsFetch;
};
