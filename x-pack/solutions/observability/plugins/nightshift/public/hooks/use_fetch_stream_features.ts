/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { SignificantEventsRepositoryClient } from '@kbn/significant-events-plugin/public';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

const NO_FEATURES: Feature[] = [];
const NO_STREAM_NAMES: string[] = [];

export interface StreamFeaturesQueryData {
  features: Feature[];
  failedStreamNames: string[];
}

/**
 * Splits per-stream loads into the features that resolved and the streams that did not.
 *
 * One unreachable stream must not blank out the services resolved from the others, so a partial
 * failure returns what loaded and names the rest. A total failure rethrows instead: an empty
 * impact list would otherwise read as "nothing was impacted".
 */
export const collectStreamFeatures = (
  streamNames: string[],
  settled: Array<PromiseSettledResult<Feature[]>>
): StreamFeaturesQueryData => {
  const failedStreamNames = streamNames.filter((_, index) => settled[index].status === 'rejected');
  if (streamNames.length > 0 && failedStreamNames.length === streamNames.length) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }

  return {
    features: settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    failedStreamNames,
  };
};

export interface StreamFeaturesResult {
  features: Feature[];
  /**
   * Streams that could not be reached. Their services are missing from `features`, so a caller
   * rendering an impact list has to say so rather than present a short list as a complete one.
   */
  failedStreamNames: string[];
  /** True only until the first load settles; a refetch keeps the previous features on screen. */
  isInitialLoading: boolean;
  /** True for any request in flight, including a retry after an error. */
  isFetching: boolean;
  /** True only when every stream failed; a partial failure reports `failedStreamNames` instead. */
  isError: boolean;
  refetch: () => void;
}

const fetchStreamFeatures = async (
  significantEventsRepositoryClient: SignificantEventsRepositoryClient,
  streamName: string,
  signal: AbortSignal | undefined
): Promise<Feature[]> => {
  const response = await significantEventsRepositoryClient.fetch(
    'GET /internal/streams/{name}/features',
    {
      params: {
        path: { name: streamName },
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
 * Loads every stream's knowledge indicators under a single cache entry so the returned array keeps
 * a stable identity across renders — callers memoize impacted entities on it, and a fresh array
 * each render would retrigger their effects.
 */
export const useFetchStreamFeatures = (streamNames: string[]): StreamFeaturesResult => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const uniqueStreamNames = [...new Set(streamNames)].sort();

  const { data, isInitialLoading, isFetching, isError, refetch } = useQuery<
    StreamFeaturesQueryData,
    Error
  >({
    queryKey: ['nightshift.streamFeatures', uniqueStreamNames],
    enabled: uniqueStreamNames.length > 0,
    queryFn: async ({ signal }) =>
      collectStreamFeatures(
        uniqueStreamNames,
        await Promise.allSettled(
          uniqueStreamNames.map((streamName) =>
            fetchStreamFeatures(significantEventsRepositoryClient, streamName, signal)
          )
        )
      ),
  });

  return {
    features: data?.features ?? NO_FEATURES,
    failedStreamNames: data?.failedStreamNames ?? NO_STREAM_NAMES,
    isInitialLoading,
    isFetching,
    isError,
    refetch,
  };
};
