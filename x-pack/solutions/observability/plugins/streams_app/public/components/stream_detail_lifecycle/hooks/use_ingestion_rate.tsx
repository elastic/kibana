/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useDataStreamStats } from './use_data_stream_stats';

export const useIngestionRate = ({
  definition,
  start,
  end,
}: {
  definition?: IngestStreamGetResponse;
  start: string;
  end: string;
}) => {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const { stats, isLoading: statsIsLoading } = useDataStreamStats({ definition });

  const ingestionRateFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition || statsIsLoading || !stats?.bytesPerDay) {
        return;
      }

      const { rawResponse } = await lastValueFrom(
        data.search.search<
          IKibanaSearchRequest,
          IKibanaSearchResponse<{
            aggregations: { docs_count: { buckets: Array<{ key: string; doc_count: number }> } };
          }>
        >(
          {
            params: {
              index: definition.stream.name,
              track_total_hits: false,
              body: {
                size: 0,
                query: {
                  bool: {
                    filter: [{ range: { '@timestamp': { gte: start, lte: end } } }],
                  },
                },
                aggs: {
                  docs_count: {
                    date_histogram: {
                      field: '@timestamp',
                      fixed_interval: '2d',
                      min_doc_count: 0,
                    },
                  },
                },
              },
            },
          },
          { abortSignal: signal }
        )
      );

      return rawResponse.aggregations.docs_count.buckets.map(({ key, doc_count }) => ({
        key,
        value: doc_count * stats.bytesPerDoc,
      }));
    },
    [definition, stats, statsIsLoading, start, end]
  );

  return {
    ingestionRate: ingestionRateFetch.value,
    isLoading: ingestionRateFetch.loading || statsIsLoading,
    refresh: ingestionRateFetch.refresh,
  };
};
