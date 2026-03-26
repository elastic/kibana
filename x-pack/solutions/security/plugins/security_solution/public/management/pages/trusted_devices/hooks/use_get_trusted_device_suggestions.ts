/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import { useHttp } from '../../../../common/lib/kibana/hooks';
import { TrustedDevicesApiClient } from '../service/api_client';

export interface UseGetTrustedDeviceSuggestionsOptions {
  field: string;
  query?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch autocomplete suggestions for trusted device fields
 * Uses React Query to handle race conditions when field changes rapidly
 */
export const useGetTrustedDeviceSuggestions = (
  { field, query = '', enabled = true }: UseGetTrustedDeviceSuggestionsOptions,
  options: UseQueryOptions<string[], IHttpFetchError> = {}
): UseQueryResult<string[], IHttpFetchError> => {
  const http = useHttp();

  return useQuery<string[], IHttpFetchError>({
    queryKey: ['trustedDevices', 'suggestions', field, query],
    ...options,
    queryFn: async () => {
      const apiClient = new TrustedDevicesApiClient(http);
      return apiClient.getSuggestions({ field, query });
    },
    enabled: !!field && enabled,
  });
};
