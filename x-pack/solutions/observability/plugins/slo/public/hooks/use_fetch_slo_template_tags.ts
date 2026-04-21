/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { FindSLOTemplateTagsResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloTemplateTagsResponse {
  isLoading: boolean;
  isError: boolean;
  data: FindSLOTemplateTagsResponse | undefined;
}

export function useFetchSloTemplateTags(): UseFetchSloTemplateTagsResponse {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.templateTags(),
    queryFn: async ({ signal }) => {
      return await sloClient.fetch('GET /api/observability/slo_templates/_tags', {
        signal,
      });
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  return {
    data,
    isLoading,
    isError,
  };
}
