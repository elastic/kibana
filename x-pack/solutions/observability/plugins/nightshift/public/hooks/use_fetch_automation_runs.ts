/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { NIGHTSHIFT_AUTOMATIONS_QUERY_KEY } from './use_fetch_automations';

export const useFetchAutomationRuns = (id: string, page = 1, size = 20) => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery({
    queryKey: [...NIGHTSHIFT_AUTOMATIONS_QUERY_KEY, id, 'runs', page, size],
    enabled: investigationsClient != null && id.length > 0,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/automations/{id}/runs', {
        params: { path: { id }, query: { page, size } },
        signal: signal ?? null,
      });
    },
  });
};

// Derive the run type from the API response so it stays in sync automatically.
type FetchResult = NonNullable<ReturnType<typeof useFetchAutomationRuns>['data']>;
export type AutomationRunRecord = FetchResult['runs'][number];
