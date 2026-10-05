/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { GetSandboxSecretsResponse } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';

export const NIGHTSHIFT_SANDBOX_SECRETS_QUERY_KEY = ['nightshift.sandboxSecrets'] as const;

export const useFetchSandboxSecrets = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseQueryResult<GetSandboxSecretsResponse, Error> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<GetSandboxSecretsResponse, Error>({
    queryKey: NIGHTSHIFT_SANDBOX_SECRETS_QUERY_KEY,
    enabled: enabled && investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/sandbox_secrets', {
        signal: signal ?? null,
      });
    },
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
