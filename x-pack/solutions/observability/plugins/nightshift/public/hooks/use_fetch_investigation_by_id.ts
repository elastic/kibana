/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { GetInvestigationResponse } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from './use_kibana';

const ACTIVE_INVESTIGATION_REFETCH_INTERVAL_MS = 5_000;

export const useFetchInvestigationById = (
  investigationId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<GetInvestigationResponse | null, Error> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<GetInvestigationResponse | null, Error>({
    queryKey: ['nightshift.investigationById', investigationId],
    enabled: enabled && Boolean(investigationId) && investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient || !investigationId) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const response = await investigationsClient.fetch(
        'GET /internal/nightshift/investigations/{id}',
        {
          params: { path: { id: investigationId } },
          signal: signal ?? null,
        }
      );
      // The route's catch block omits throw/return, so TS infers `| undefined`.
      // react-query v4 also rejects `undefined` data, so `?? null` handles both.
      return response ?? null;
    },
    refetchInterval: (data) =>
      data != null && (data.status === 'pending' || data.status === 'running')
        ? ACTIVE_INVESTIGATION_REFETCH_INTERVAL_MS
        : false,
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
