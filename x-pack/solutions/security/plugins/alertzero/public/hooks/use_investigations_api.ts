/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, ALERTZERO_INVESTIGATIONS_COUNT_URL } from '@kbn/alertzero-common';
import { retryOnTransientError } from './retry_on_transient_error';

interface InvestigationsCountResponse {
  total: number;
}

/** Count of AlertZero investigations in the current space. */
export const useInvestigationsCount = (enabled: boolean): UseQueryResult<number> => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['alertzero', 'investigations', 'count'] as const,
    queryFn: async (): Promise<number> => {
      const response = await services.http!.get<InvestigationsCountResponse>(
        ALERTZERO_INVESTIGATIONS_COUNT_URL,
        { version: API_VERSIONS.internal.v1 }
      );
      return response.total;
    },
    enabled,
    retry: retryOnTransientError,
  });
};
