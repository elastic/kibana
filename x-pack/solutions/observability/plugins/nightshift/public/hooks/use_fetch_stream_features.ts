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

export interface StreamFeaturesResult {
  features: Feature[];
  isLoading: boolean;
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

  const { data, isInitialLoading, isError, refetch } = useQuery<Feature[], Error>({
    queryKey: ['nightshift.streamFeatures', uniqueStreamNames],
    enabled: uniqueStreamNames.length > 0,
    queryFn: async ({ signal }) => {
      const featuresByStream = await Promise.all(
        uniqueStreamNames.map((streamName) =>
          fetchStreamFeatures(significantEventsRepositoryClient, streamName, signal)
        )
      );
      return featuresByStream.flat();
    },
  });

  return { features: data ?? NO_FEATURES, isLoading: isInitialLoading, isError, refetch };
};
