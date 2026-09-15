/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_AUTOMATIONS_QUERY_KEY = ['nightshift.automations'] as const;

export const useFetchAutomations = () => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery({
    queryKey: [...NIGHTSHIFT_AUTOMATIONS_QUERY_KEY],
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/automations', {
        signal: signal ?? null,
      });
    },
  });
};

// Derive the automation record type from the API response so it stays in sync automatically.
type FetchResult = NonNullable<ReturnType<typeof useFetchAutomations>['data']>;
export type AutomationRecord = FetchResult['automations'][number];
