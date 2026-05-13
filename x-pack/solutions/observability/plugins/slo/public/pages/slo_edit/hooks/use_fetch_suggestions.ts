/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export function useFetchSLOSuggestions() {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchSLOSuggestions'],
    queryFn: async ({ signal }) => {
      return sloClient.fetch('GET /internal/observability/slos/suggestions', {
        signal,
      });
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    suggestions: data,
    isLoading,
    isSuccess,
    isError,
  };
}
