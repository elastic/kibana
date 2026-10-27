/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { ActionType } from '@kbn/actions-types';
import { fetchConnectorTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector_types';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';

const NIGHTSHIFT_SANDBOX_CONNECTOR_TYPES_QUERY_KEY = ['nightshift.sandboxConnectorTypes'] as const;

export const useFetchSandboxConnectorTypes = (): UseQueryResult<ActionType[], Error> => {
  const { http } = useKibana().services;
  return useQuery<ActionType[], Error>({
    queryKey: NIGHTSHIFT_SANDBOX_CONNECTOR_TYPES_QUERY_KEY,
    queryFn: () => fetchConnectorTypes({ http, sandboxCapableOnly: true }),
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
