/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOInput } from '@kbn/slo-schema';
import { useQuery } from '@kbn/react-query';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export function useFetchSloInspect(slo: CreateSLOInput | undefined, shouldInspect: boolean) {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: sloKeys.inspect(slo),
    queryFn: async ({ signal }) => {
      if (!slo) {
        throw new Error('No SLO to inspect');
      }
      return sloClient.fetch('POST /internal/observability/slos/_inspect', {
        params: { body: slo },
        signal,
      });
    },
    enabled: shouldInspect && slo !== undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    isSuccess,
    isError,
  };
}
