/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { SandboxConnectorType } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';

const NIGHTSHIFT_SANDBOX_CONNECTOR_TYPES_QUERY_KEY = ['nightshift.sandboxConnectorTypes'] as const;

/** The connector types the investigation agent can use from its sandbox. */
export const useFetchSandboxConnectorTypes = (): UseQueryResult<SandboxConnectorType[], Error> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;
  return useQuery<SandboxConnectorType[], Error>({
    queryKey: NIGHTSHIFT_SANDBOX_CONNECTOR_TYPES_QUERY_KEY,
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const { connector_types: connectorTypes } = await investigationsClient.fetch(
        'GET /internal/nightshift/sandbox_connector_types',
        { signal: signal ?? null }
      );
      return connectorTypes;
    },
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
