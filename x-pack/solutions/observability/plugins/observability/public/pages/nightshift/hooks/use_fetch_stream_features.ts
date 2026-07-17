/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import { isComputedFeature, type Feature } from '@kbn/significant-events-schema';
import { useKibana } from '../../../utils/kibana_react';

interface StreamFeaturesResponse {
  features: Feature[];
}

export const useFetchStreamFeatures = (
  streamName: string | undefined
): UseQueryResult<Feature[], Error> => {
  const { streams } = useKibana().services;

  return useQuery<Feature[], Error>({
    queryKey: ['nightshift.streamFeatures', streamName],
    enabled: Boolean(streamName),
    queryFn: async ({ signal }) => {
      const response = await streams.streamsRepositoryClient.fetch<StreamFeaturesResponse>(
        'GET /internal/streams/{name}/features',
        {
          params: {
            path: { name: streamName! },
            query: { include_excluded: true },
          },
          signal,
        }
      );

      return (response.features ?? []).filter((feature) => !isComputedFeature(feature));
    },
  });
};
