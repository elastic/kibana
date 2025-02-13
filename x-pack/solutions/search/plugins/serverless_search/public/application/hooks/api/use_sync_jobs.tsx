/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pagination } from '@elastic/eui';
import { ConnectorSyncJob, Paginate } from '@kbn/search-connectors';
import { useQuery } from '@tanstack/react-query';
import { useKibanaServices } from '../use_kibana';

export const useSyncJobs = (
  connectorId: string,
  pagination: Omit<Pagination, 'totalItemCount'>
) => {
  const { http } = useKibanaServices();
  return useQuery({
    keepPreviousData: true,
    queryKey: ['fetchSyncJobs', pagination],
    queryFn: async () =>
      http.fetch<Paginate<ConnectorSyncJob>>(
        `/internal/serverless_search/connectors/${connectorId}/sync_jobs`,
        {
          query: {
            from: pagination.pageIndex * (pagination.pageSize || 10),
            size: pagination.pageSize || 10,
          },
        }
      ),
  });
};
