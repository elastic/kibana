/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOInput } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { usePluginContext } from './use_plugin_context';

export function useFetchSloInspect(slo: CreateSLOInput, shouldInspect: boolean) {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['slo', 'inspect'],
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch('POST /internal/observability/slos/_inspect', {
          params: { body: slo },
          signal,
        });
      } catch (error) {
        // ignore error
      }
    },
    enabled: shouldInspect,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isSuccess,
    isError,
  };
}
