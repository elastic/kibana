/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPreviewDataResponse, Indicator, Objective } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseGetPreviewData {
  data: GetPreviewDataResponse | undefined;
  isInitialLoading: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface Props {
  isValid: boolean;
  groupBy?: string | string[];
  instanceId?: string;
  remoteName?: string;
  groupings?: Record<string, unknown>;
  objective?: Objective;
  indicator: Indicator;
  range: {
    from: Date;
    to: Date;
  };
}

export function useGetPreviewData({
  isValid,
  range,
  indicator,
  objective,
  groupBy,
  groupings,
  instanceId,
  remoteName,
}: Props): UseGetPreviewData {
  const { sloClient } = usePluginContext();

  const { isInitialLoading, isLoading, isError, isSuccess, data } = useQuery({
    queryKey: sloKeys.preview(indicator, range, groupings),
    queryFn: async ({ signal }) => {
      const response = await sloClient.fetch('POST /internal/observability/slos/_preview', {
        params: {
          body: {
            indicator,
            range: {
              from: range.from.toISOString(),
              to: range.to.toISOString(),
            },
            groupBy,
            instanceId,
            groupings,
            remoteName,
            ...(objective ? { objective } : null),
          },
        },
        signal,
      });

      return Array.isArray(response) ? response : [];
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isValid,
  });

  return {
    data,
    isLoading,
    isInitialLoading,
    isSuccess,
    isError,
  };
}
