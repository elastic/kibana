/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { INVESTIGATION_AVAILABILITY_QUERY_KEY } from '../query_keys';

/** A rejection, such as a missing `agentBuilder:write`, counts as unavailable. */
export const useFetchInvestigationAvailability = (): {
  isAvailable: boolean;
  isLoading: boolean;
} => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  const { data, isInitialLoading } = useQuery({
    queryKey: INVESTIGATION_AVAILABILITY_QUERY_KEY,
    queryFn: ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Investigations are not available.');
      }
      return investigationsClient.fetch('GET /internal/nightshift/investigations/availability', {
        signal: signal ?? null,
      });
    },
    enabled: Boolean(investigationsClient),
    retry: false,
  });

  return { isAvailable: data?.available === true, isLoading: isInitialLoading };
};
