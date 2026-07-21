/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import type { SignificantEventsRouteRepository } from '@kbn/significant-events-plugin/server';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import type { StreamsRepositoryClientOptions } from '@kbn/streams-plugin/public/api';
import { useKibana } from '../../../utils/kibana_react';

type MergedStreamsRepositoryClient = RouteRepositoryClient<
  StreamsRouteRepository & SignificantEventsRouteRepository,
  StreamsRepositoryClientOptions
>;

export const useFetchStreamFeatures = (
  streamName: string | undefined
): UseQueryResult<Feature[], Error> => {
  const { streams } = useKibana().services;
  const streamsRepositoryClient = streams.streamsRepositoryClient as MergedStreamsRepositoryClient;

  return useQuery<Feature[], Error>({
    queryKey: ['nightshift.streamFeatures', streamName],
    enabled: Boolean(streamName),
    queryFn: async ({ signal }) => {
      const name = streamName as string;
      const response = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/features',
        {
          params: {
            path: { name },
            query: {
              include_excluded: true,
            },
          },
          signal: signal ?? null,
        }
      );

      return (response.features ?? []).filter((feature) => !isComputedFeature(feature));
    },
  });
};
