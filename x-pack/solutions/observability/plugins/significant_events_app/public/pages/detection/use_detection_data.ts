/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { getQueryBucketParams } from '../../util/get_query_bucket_params';
import { useEngineActivity } from './use_engine_activity';

export const useDetectionData = (rangeFrom: string, rangeTo: string) => {
  const {
    dependencies: {
      start: {
        significantEvents: { significantEventsRepositoryClient: repository },
        data,
      },
    },
  } = useKibana();
  const engineActivity = useEngineActivity();
  const query = useQuery({
    queryKey: ['detectionWorkspace', rangeFrom, rangeTo],
    queryFn: async ({ signal }) => {
      const range = getAbsoluteTimeRange(
        { from: rangeFrom, to: rangeTo },
        { forceNow: new Date() }
      );
      const start = new Date(range.from).getTime();
      const end = new Date(range.to).getTime();
      const bucket = getQueryBucketParams(data.query.timefilter.timefilter, { start, end });
      if (!bucket) throw new Error('Could not resolve the selected time range');
      const request = { signal: signal ?? null };
      const [features, queries, detections, events, activity] = await Promise.all([
        repository.fetch('GET /internal/streams/_features', {
          ...request,
          params: { query: { include_excluded: true, include_expired: true } },
        }),
        repository.fetch('GET /internal/streams/_queries', {
          ...request,
          params: { query: { ...bucket, page: 1, perPage: 1000, query: '' } },
        }),
        repository.fetch('GET /internal/significant_events/detections', {
          ...request,
          params: { query: { from: bucket.from, to: bucket.to, page: 1, perPage: 1000 } },
        }),
        repository.fetch('GET /internal/significant_events/events', {
          ...request,
          params: { query: { from: bucket.from, to: bucket.to, page: 1, perPage: 1000 } },
        }),
        repository.fetch('GET /internal/significant_events/knowledge_activity', {
          ...request,
          params: { query: { from: bucket.from, to: bucket.to } },
        }),
      ]);
      return { features, queries, detections, events, activity, start, end };
    },
    refetchInterval: engineActivity.data?.runs.some((run) => run.active) ? 3000 : 15_000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });
  return query;
};
