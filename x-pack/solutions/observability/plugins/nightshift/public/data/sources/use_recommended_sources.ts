/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedSource } from '@kbn/nightshift-shared';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { SOURCES_QUERY_KEY } from '../query_keys';

const RECOMMENDED_SOURCES_QUERY_KEY = [...SOURCES_QUERY_KEY, 'recommended'] as const;

export const useRecommendedSources = () => {
  const { nightshiftSources } = useKibana().services;

  return useQuery<RecommendedSource[], Error>({
    queryKey: RECOMMENDED_SOURCES_QUERY_KEY,
    queryFn: async ({ signal }: QueryFunctionContext) => {
      const client = await nightshiftSources.getClient();
      const { recommendations } = await client.fetch(
        'GET /internal/nightshift/sources/_recommended',
        { signal: signal ?? null }
      );
      return recommendations;
    },
  });
};
