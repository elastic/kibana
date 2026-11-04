/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { GetSandboxAllowlistResponse } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';

export const NIGHTSHIFT_SANDBOX_ALLOWLIST_QUERY_KEY = ['nightshift.sandboxAllowlist'] as const;

export const useFetchSandboxAllowlist = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseQueryResult<GetSandboxAllowlistResponse, Error> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<GetSandboxAllowlistResponse, Error>({
    queryKey: NIGHTSHIFT_SANDBOX_ALLOWLIST_QUERY_KEY,
    enabled: enabled && investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/sandbox_allowlist', {
        signal: signal ?? null,
      });
    },
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
