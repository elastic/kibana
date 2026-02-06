/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { InfraTimerangeInput } from '../../../../../common/http_api';
import { calculateRateTimeranges } from './calculate_rate_timeranges';

export const createRateAggsWithInterface = (
  timerange: InfraTimerangeInput,
  id: string,
  field: string,
  interfaceField: string,
  filter?: estypes.QueryDslQueryContainer
): Record<string, estypes.AggregationsAggregationContainer> => {
  const { firstBucketRange, secondBucketRange, intervalInSeconds } =
    calculateRateTimeranges(timerange);

  const interfaceAggs = {
    interfaces: {
      terms: {
        field: interfaceField,
      },
      aggs: { maxValue: { max: { field } } },
    },
    sumOfInterfaces: {
      sum_bucket: {
        buckets_path: 'interfaces>maxValue',
      },
    },
  };

  const createBucketFilter = (range: { from: number; to: number }) => {
    const rangeFilter: estypes.QueryDslQueryContainer = {
      range: {
        '@timestamp': {
          gte: range.from,
          lt: range.to,
          format: 'epoch_millis',
        },
      },
    };

    if (!filter) {
      return rangeFilter;
    }

    return {
      bool: {
        must: [filter, rangeFilter],
      },
    };
  };

  return {
    [`${id}_first_bucket`]: {
      filter: createBucketFilter(firstBucketRange),
      aggs: interfaceAggs,
    },
    [`${id}_second_bucket`]: {
      filter: createBucketFilter(secondBucketRange),
      aggs: interfaceAggs,
    },
    [id]: {
      bucket_script: {
        buckets_path: {
          first: `${id}_first_bucket.sumOfInterfaces`,
          second: `${id}_second_bucket.sumOfInterfaces`,
        },
        script: `params.second > 0.0 && params.first > 0.0 && params.second > params.first ? (params.second - params.first) / ${intervalInSeconds}: null`,
      },
    },
  };
};
