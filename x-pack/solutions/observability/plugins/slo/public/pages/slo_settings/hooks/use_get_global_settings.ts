/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export const GLOBAL_SETTINGS_QUERY_KEY = ['getSloGlobalSettings'] as const;

interface UseGetGlobalSettingsResponse {
  data: GetSLOGlobalSettingsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const useGetGlobalSettings = (): UseGetGlobalSettingsResponse => {
  const { sloClient } = usePluginContext();
  const { data, isLoading, isError } = useQuery({
    queryKey: GLOBAL_SETTINGS_QUERY_KEY,
    queryFn: ({ signal }) =>
      sloClient.fetch('GET /api/observability/slo_settings/global 2023-10-31', { signal }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { data, isLoading, isError };
};
