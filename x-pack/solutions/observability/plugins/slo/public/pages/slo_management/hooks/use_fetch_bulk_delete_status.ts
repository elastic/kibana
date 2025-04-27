/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkDeleteStatusResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { sloKeys } from '../../../hooks/query_key_factory';
import { usePluginContext } from '../../../hooks/use_plugin_context';

interface UseFetchBulkDeleteStatus {
  data: BulkDeleteStatusResponse | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useFetchBulkDeleteStatus({ taskId }: { taskId: string }): UseFetchBulkDeleteStatus {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: sloKeys.bulkDeleteStatus(taskId),
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch(
          'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31',
          {
            params: { path: { taskId } },
            signal,
          }
        );
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, isSuccess, data, refetch };
}
