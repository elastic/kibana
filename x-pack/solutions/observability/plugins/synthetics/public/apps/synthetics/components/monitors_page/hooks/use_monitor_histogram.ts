/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { useEsSearch } from '@kbn/observability-shared-plugin/public';

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

export const useMonitorHistogram = ({ items }: { items: OverviewStatusMetaData[] }) => {
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const { lastRefresh } = useSyntheticsRefreshContext();

  const monitorIds = (items ?? []).map(({ configId }) => configId);

  const { queryParams, minInterval } = getQueryParams(
    dateRangeStart,
    dateRangeEnd,
    monitorIds,
    SYNTHETICS_INDEX_PATTERN
  );

  const { data, loading } = useEsSearch<Ping, typeof queryParams>(
    queryParams,
    [JSON.stringify(monitorIds), lastRefresh],
    {
      name: 'getMonitorDownHistory',
    }
  );

  const byIdsBuckets = data?.aggregations?.byIds.buckets ?? [];
  const histogramsById: { [key: string]: Histogram } = {};

  byIdsBuckets.forEach((idBucket) => {
    idBucket.perLocation.buckets.forEach((locationBucket) => {
      const uniqId = `${idBucket.key}-${locationBucket.key}`;
      const points: HistogramPoint[] = [];
      locationBucket.histogram.buckets.forEach((histogramBucket) => {
        const timestamp = histogramBucket.key;
        const down = histogramBucket.totalDown.value ?? 0;
        points.push({
          timestamp,
          up: undefined,
          down,
        });
      });
      histogramsById[uniqId] = { points };
    });
  });

  return { histogramsById, loading, minInterval };
};

const getQueryParams = (
  dateRangeStart: string,
  dateRangeEnd: string,
  configIds: string[],
  index: string
) => {
  const minInterval = getHistogramInterval(dateRangeStart, dateRangeEnd, 30);

  const queryParams = {
    index,
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
          perLocation: {
            terms: {
              field: 'observer.name',
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
      },
    },
  };

  return { queryParams, minInterval };
};
