/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { AggregatedFeature } from '@kbn/significant-events-schema';
import { FEATURES_QUERY_KEY } from '../query_keys';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';

interface FetchFeaturesResult {
  features: AggregatedFeature[];
}

export const useFetchFeatures = () => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();

  const fetchFeatures = async ({
    signal,
  }: QueryFunctionContext): Promise<FetchFeaturesResult | undefined> => {
    return await significantEventsRepositoryClient.fetch('GET /internal/streams/_features', {
      signal: signal ?? null,
      params: {
        query: {
          include_excluded: true,
        },
      },
    });
  };

  return useQuery<FetchFeaturesResult | undefined, Error>({
    queryKey: [...FEATURES_QUERY_KEY, 'all'],
    queryFn: fetchFeatures,
    onError: showFetchErrorToast,
  });
};
