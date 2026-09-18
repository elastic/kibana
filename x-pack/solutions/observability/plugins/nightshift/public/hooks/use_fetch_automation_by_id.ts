/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { NIGHTSHIFT_AUTOMATIONS_QUERY_KEY } from './use_fetch_automations';

export const useFetchAutomationById = (id: string) => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery({
    queryKey: [...NIGHTSHIFT_AUTOMATIONS_QUERY_KEY, id],
    enabled: investigationsClient != null && id.length > 0,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/automations/{id}', {
        params: { path: { id } },
        signal: signal ?? null,
      });
    },
  });
};
