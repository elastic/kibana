/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { IKibanaSearchResponse, IEsSearchRequest } from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../common/lib/kibana';

const QUERY_KEY = 'cost_savings_data';

/**
 * Reusable method that returns a promise wrapping the search functionality of Kibana search service
 * Following the same pattern as createFetchData in the security solution
 */
const createFetchLensData = async <TResponse>(
  searchService: ISearchStart,
  req: IEsSearchRequest
): Promise<TResponse> => {
  let rawResponse: TResponse;
  return new Promise<TResponse>((resolve, reject) => {
    searchService.search<IEsSearchRequest, IKibanaSearchResponse<TResponse>>(req).subscribe({
      next: (response) => {
        rawResponse = response.rawResponse;
      },
      complete: () => {
        resolve(rawResponse);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

const buildCostSavingsSearchRequest = (
  from: string,
  to: string,
  minutesPerAlert: number,
  analystHourlyRate: number,
  indexPattern: string
): IEsSearchRequest => ({
  params: {
    index: indexPattern,
    size: 0, // We only need aggregations
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
      },
    },
    aggs: {
      cost_savings_over_time: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: '1d',
        },
        aggs: {
          alert_count: {
            value_count: {
              field: '@timestamp',
            },
          },
          cost_savings: {
            bucket_script: {
              buckets_path: {
                count: 'alert_count',
              },
              script: {
                source: `params.count * (${minutesPerAlert}/60.0) * ${analystHourlyRate}`,
              },
            },
          },
        },
      },
    },
  },
});

export const useFetchCostSavingsData = ({
  from,
  to,
  minutesPerAlert,
  analystHourlyRate,
  indexPattern,
  enabled = true,
}: {
  from: string;
  to: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
  indexPattern: string;
  enabled?: boolean;
}) => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  const searchRequest = buildCostSavingsSearchRequest(
    from,
    to,
    minutesPerAlert,
    analystHourlyRate,
    indexPattern
  );

  return useQuery(
    [QUERY_KEY, from, to, minutesPerAlert, analystHourlyRate, indexPattern],
    () => createFetchLensData(searchService, searchRequest),
    {
      enabled,
      keepPreviousData: true,
    }
  );
};
