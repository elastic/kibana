/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export function useFetchCompositeSloSuggestions() {
  const { sloClient } = usePluginContext();

  const { data, isLoading } = useQuery({
    queryKey: sloKeys.compositeSuggestions(),
    queryFn: async ({ signal }) => {
      return sloClient.fetch('GET /internal/observability/slo_composites/suggestions', {
        signal,
      });
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    suggestions: data,
    isLoading,
  };
}
