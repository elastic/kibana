/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import type { QueryClient, QueryFunctionContext } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { useKibana } from '../../hooks/use_kibana';
import { FEATURES_QUERY_KEY } from '../query_keys';

const ERROR_REFETCH_INTERVAL_MS = 60_000;
// Report one outage until every failing polling observer recovers or unmounts.
const failedPollingObservers = new WeakMap<QueryClient, Set<symbol>>();

export const useStreamFeatures = (
  sourceId: string,
  deps: unknown[] = [],
  {
    enabled = true,
    refetchInterval = false,
  }: { enabled?: boolean; refetchInterval?: number | false } = {}
) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();
  const queryClient = useQueryClient();
  const [pollingObserverId] = useState(() => Symbol());
  const isPollingEnabled = enabled && !!refetchInterval;

  useEffect(
    () => () => {
      failedPollingObservers.get(queryClient)?.delete(pollingObserverId);
    },
    [queryClient, pollingObserverId, sourceId, isPollingEnabled]
  );

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

  const { data, isLoading, error, refetch } = useQuery<{ features: Feature[] }, Error>({
    queryKey: [...FEATURES_QUERY_KEY, sourceId, ...deps],
    queryFn: fetchFeatures,
    onError: (fetchError) => {
      if (!isPollingEnabled) {
        showFetchErrorToast(fetchError);
        return;
      }

      const failures = failedPollingObservers.get(queryClient) ?? new Set<symbol>();
      const shouldShowErrorToast = failures.size === 0;
      failures.add(pollingObserverId);
      failedPollingObservers.set(queryClient, failures);

      if (shouldShowErrorToast) {
        showFetchErrorToast(fetchError);
      }
    },
    onSuccess: () => {
      failedPollingObservers.get(queryClient)?.delete(pollingObserverId);
    },
    enabled,
    refetchInterval: (_data, query) => {
      if (!refetchInterval || query.state.status !== 'error') {
        return refetchInterval;
      }

      return Math.max(refetchInterval, ERROR_REFETCH_INTERVAL_MS);
    },
    refetchIntervalInBackground: false,
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

  return {
    features,
    excludedFeatures,
    featuresLoading: isLoading,
    refreshFeatures: refetch,
    error,
  };
};
