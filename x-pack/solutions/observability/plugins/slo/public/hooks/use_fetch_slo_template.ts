/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetSLOTemplateResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloTemplateResponse {
  isInitialLoading: boolean;
  isError: boolean;
  data: GetSLOTemplateResponse | undefined;
}

export function useFetchSloTemplate(templateId?: string): UseFetchSloTemplateResponse {
  const { sloClient } = usePluginContext();

  const { isInitialLoading, isError, data } = useQuery({
    queryKey: sloKeys.template(templateId!),
    queryFn: async ({ signal }) => {
      return await sloClient.fetch('GET /api/observability/slo_templates/{templateId}', {
        params: { path: { templateId: templateId! } },
        signal,
      });
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: Boolean(templateId),
  });

  return {
    data,
    isInitialLoading,
    isError,
  };
}
