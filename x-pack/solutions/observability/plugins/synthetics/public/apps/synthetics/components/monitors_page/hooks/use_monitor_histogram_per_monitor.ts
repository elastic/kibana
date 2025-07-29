/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';
import { getHistogramInterval } from '../common/get_histogram_interval';
import {
  Histogram,
  HistogramPoint,
  OverviewStatusMetaData,
  Ping,
} from '../../../../../../common/runtime_types';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useGetUrlParams } from '../../../hooks';
import { useSyntheticsRefreshContext } from '../../../contexts';

export const useMonitorHistogramPerMonitor = ({
  items,
  isReady,
}: {
  items: OverviewStatusMetaData[];
  isReady: boolean;
}) => {
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const { lastRefresh } = useSyntheticsRefreshContext();

  const monitorIds = (items ?? []).map(({ configId }) => configId);

  const { queryParams, minInterval } = getQueryParams(dateRangeStart, dateRangeEnd, monitorIds);
  const { data, loading } = useReduxEsSearch<Ping, typeof queryParams>(
    queryParams,
    [JSON.stringify(monitorIds), lastRefresh],
    {
      name: 'getMonitorDownHistoryPerMonitor',
      isRequestReady: isReady,
    }
  );

  const byIdsBuckets = data?.aggregations?.byIds.buckets ?? [];
  const histogramsById: { [key: string]: Histogram } = {};

  byIdsBuckets.forEach((idBucket) => {
    const points: HistogramPoint[] = [];
    idBucket.histogram.buckets.forEach((histogramBucket) => {
      const timestamp = histogramBucket.key;
      const down = histogramBucket.totalDown.value ?? 0;
      points.push({
        timestamp,
        up: undefined,
        down,
      });
    });
    histogramsById[idBucket.key] = { points };
  });

  return { histogramsById, loading, minInterval };
};

const getQueryParams = (dateRangeStart: string, dateRangeEnd: string, configIds: string[]) => {
  const minInterval = getHistogramInterval(dateRangeStart, dateRangeEnd, 30);

  const queryParams = {
    index: SYNTHETICS_INDEX_PATTERN,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              'summary.down': { gt: 0 },
            },
          },
          {
            terms: {
              config_id: configIds,
            },
          },
          {
            range: {
              '@timestamp': {
                gte: dateRangeStart,
                lte: dateRangeEnd,
              },
            },
          },
        ] as estypes.QueryDslQueryContainer,
      },
    },
    aggs: {
      byIds: {
        terms: {
          field: 'monitor.id',
          size: Math.max(configIds.length, 1),
        },
        aggs: {
          histogram: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: minInterval + 'ms',
            },
            aggs: {
              totalDown: {
                sum: { field: 'summary.down' },
              },
            },
          },
        },
      },
    },
  };

  return { queryParams, minInterval };
};
