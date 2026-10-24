/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient, type UseQueryResult } from '@kbn/react-query';
import { useCallback } from 'react';
import type { GetSandboxConnectorsResponse } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';

export const NIGHTSHIFT_SANDBOX_CONNECTORS_QUERY_KEY = ['nightshift.sandboxConnectors'] as const;

/** The connectors the investigation agent can use from its sandbox in the current space. */
export const useFetchSandboxConnectors = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseQueryResult<GetSandboxConnectorsResponse, Error> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;
  return useQuery<GetSandboxConnectorsResponse, Error>({
    queryKey: NIGHTSHIFT_SANDBOX_CONNECTORS_QUERY_KEY,
    enabled: enabled && investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/sandbox_connectors', {
        signal: signal ?? null,
      });
    },
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};

/** Refetches the sandbox connectors, e.g. after one was created in the connector flyout. */
export const useRefreshSandboxConnectors = (): (() => void) => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_SANDBOX_CONNECTORS_QUERY_KEY });
  }, [queryClient]);
};
