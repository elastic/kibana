/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { FEATURES_QUERY_KEY } from '../query_keys';

const ERROR_REFETCH_INTERVAL_MS = 60_000;

export const useStreamFeatures = (
  sourceId: string,
  deps: unknown[] = [],
  {
    enabled = true,
    refetchInterval = false,
  }: { enabled?: boolean; refetchInterval?: number | false } = {}
) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;

  const fetchFeatures = async ({ signal: querySignal }: QueryFunctionContext) => {
    return significantEventsRepositoryClient.fetch('GET /internal/streams/{sourceId}/features', {
      params: {
        path: {
          sourceId,
        },
        query: {
          include_excluded: true,
        },
      },
      signal: querySignal ?? null,
    });
  };

  const { data, isLoading, isError, isFetched, error, refetch } = useQuery<
    { features: Feature[] },
    Error
  >({
    queryKey: [...FEATURES_QUERY_KEY, sourceId, ...deps],
    queryFn: fetchFeatures,
    enabled,
    refetchInterval: (_data, query) => {
      if (!refetchInterval || query.state.status !== 'error') {
        return refetchInterval;
      }

      return Math.max(refetchInterval, ERROR_REFETCH_INTERVAL_MS);
    },
  });

  const allFeatures = useMemo(
    () => (data?.features ?? []).filter((feature) => !isComputedFeature(feature)),
    [data?.features]
  );

  const features = useMemo(() => allFeatures.filter((feature) => !feature.excluded), [allFeatures]);

  const excludedFeatures = useMemo(
    () => allFeatures.filter((feature) => !!feature.excluded),
    [allFeatures]
  );
  // An initial failed query returns to loading during retries without cached data.
  const hasError = isError || (isLoading && isFetched);

  return {
    features,
    excludedFeatures,
    featuresLoading: isLoading,
    refreshFeatures: refetch,
    error,
    hasError,
  };
};
