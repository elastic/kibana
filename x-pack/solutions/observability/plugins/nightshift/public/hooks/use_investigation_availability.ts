/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

const NIGHTSHIFT_INVESTIGATION_AVAILABILITY_QUERY_KEY = [
  'nightshift.investigationAvailability',
] as const;

const AVAILABILITY_STALE_TIME_MS = 30_000;

/**
 * Whether the current user can start an investigation. The endpoint requires the same
 * `agentBuilder:write` privilege as starting one, so a 403 means the user cannot start either.
 */
export const useInvestigationAvailability = (): { canStartInvestigation: boolean } => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  const { data, isError } = useQuery({
    queryKey: NIGHTSHIFT_INVESTIGATION_AVAILABILITY_QUERY_KEY,
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/investigations/availability', {
        signal: signal ?? null,
      });
    },
    retry: false,
    staleTime: AVAILABILITY_STALE_TIME_MS,
  });

  return { canStartInvestigation: !isError && data?.available === true };
};
