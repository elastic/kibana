/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import type { SignificantEventsRepositoryClient } from '@kbn/significant-events-plugin/public';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

const NO_FEATURES: Feature[] = [];
const NO_SOURCE_IDS: string[] = [];

export interface SourceFeaturesQueryData {
  features: Feature[];
  failedSourceIds: string[];
}

/**
 * Splits per-source loads into the features that resolved and the sources that did not.
 *
 * One unreachable source must not blank out the services resolved from the others, so a partial
 * failure returns what loaded and names the rest. A total failure rethrows instead: an empty
 * impact list would otherwise read as "nothing was impacted".
 */
export const collectSourceFeatures = (
  sourceIds: string[],
  settled: Array<PromiseSettledResult<Feature[]>>
): SourceFeaturesQueryData => {
  const failedSourceIds = sourceIds.filter((_, index) => settled[index].status === 'rejected');
  if (sourceIds.length > 0 && failedSourceIds.length === sourceIds.length) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }

  return {
    features: settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    failedSourceIds,
  };
};

export interface SourceFeaturesResult {
  features: Feature[];
  /**
   * Sources that could not be reached. Their services are missing from `features`, so a caller
   * rendering an impact list has to say so rather than present a short list as a complete one.
   */
  failedSourceIds: string[];
  /** True only until the first load settles; a refetch keeps the previous features on screen. */
  isInitialLoading: boolean;
  /** True for any request in flight, including a retry after an error. */
  isFetching: boolean;
  /** True only when every source failed; a partial failure reports `failedSourceIds` instead. */
  isError: boolean;
  refetch: () => void;
}

const fetchSourceFeatures = async (
  significantEventsRepositoryClient: SignificantEventsRepositoryClient,
  sourceId: string,
  signal: AbortSignal | undefined
): Promise<Feature[]> => {
  const response = await significantEventsRepositoryClient.fetch(
    'GET /internal/streams/{sourceId}/features',
    {
      params: {
        path: { sourceId },
        query: {
          include_excluded: true,
        },
      },
      signal: signal ?? null,
    }
  );

  return (response.features ?? []).filter((feature) => !isComputedFeature(feature));
};

/**
 * Loads every source's knowledge indicators under a single cache entry so the returned array keeps
 * a stable identity across renders. Callers memoize impacted entities on it, and a fresh array
 * each render would retrigger their effects.
 */
export const useFetchSourceFeatures = (sourceIds: string[]): SourceFeaturesResult => {
  const {
    application,
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const { canShow } = getNightshiftCapabilities(application.capabilities.nightshift);
  const uniqueSourceIds = [...new Set(sourceIds)].sort();

  const { data, isInitialLoading, isFetching, isError, refetch } = useQuery<
    SourceFeaturesQueryData,
    Error
  >({
    queryKey: ['nightshift.sourceFeatures', uniqueSourceIds],
    enabled: canShow && uniqueSourceIds.length > 0,
    queryFn: async ({ signal }) =>
      collectSourceFeatures(
        uniqueSourceIds,
        await Promise.allSettled(
          uniqueSourceIds.map((sourceId) =>
            fetchSourceFeatures(significantEventsRepositoryClient, sourceId, signal)
          )
        )
      ),
  });

  return {
    features: data?.features ?? NO_FEATURES,
    failedSourceIds: data?.failedSourceIds ?? NO_SOURCE_IDS,
    isInitialLoading,
    isFetching,
    isError,
    refetch,
  };
};
