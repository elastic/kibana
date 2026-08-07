/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries, useQuery, type UseQueryOptions, type UseQueryResult } from '@kbn/react-query';
import type { SignificantEventsRepositoryClient } from '@kbn/significant-events-plugin/public';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

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

export const useFetchStreamFeatures = (
  streamName: string | undefined
): UseQueryResult<Feature[], Error> => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;

  return useQuery<Feature[], Error>({
    queryKey: ['nightshift.streamFeatures', streamName],
    enabled: Boolean(streamName),
    queryFn: async ({ signal }) =>
      fetchStreamFeatures(significantEventsRepositoryClient, streamName!, signal),
  });
};

export const useFetchStreamFeaturesByStream = (
  streamNames: string[]
): ReadonlyMap<string, Feature[]> => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;

  const queries = useQueries({
    queries: streamNames.map(
      (streamName): UseQueryOptions<Feature[], Error> => ({
        queryKey: ['nightshift.streamFeatures', streamName],
        enabled: Boolean(streamName),
        queryFn: ({ signal }) =>
          fetchStreamFeatures(significantEventsRepositoryClient, streamName, signal),
      })
    ),
  });

  const featuresByStream = new Map<string, Feature[]>();
  streamNames.forEach((streamName, index) => {
    featuresByStream.set(streamName, queries[index]?.data ?? []);
  });
  return featuresByStream;
};
