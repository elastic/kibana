/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse, AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { convertToBuiltInComparators } from '@kbn/observability-plugin/common';
import type { MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { Aggregators } from '../../../../../common/alerting/metrics';
import type { AdditionalContext } from '../../common/utils';
import {
  doFieldsExist,
  KUBERNETES_POD_UID,
  termsAggField,
  UNGROUPED_FACTORY_KEY,
} from '../../common/utils';
import { getElasticsearchMetricQuery } from './metric_query';

export type GetDataResponse = Record<
  string,
  {
    warn: boolean;
    trigger: boolean;
    value: number | null;
    bucketKey: BucketKey;
  } & AdditionalContext
>;

export type BucketKey = Record<string, string>;
interface AggregatedValue {
  value: number | null;
  values?: Record<string, number | null>;
}
interface Aggs {
  currentPeriod: {
    buckets: {
      all: {
        doc_count: number;
        aggregatedValue?: AggregatedValue;
      };
    };
  };
  aggregatedValue?: AggregatedValue;
  shouldWarn?: {
    value: number;
  };
  shouldTrigger?: {
    value: number;
  };
  missingGroup?: {
    value: number;
  };
  containerContext?: ContainerContext;
  additionalContext?: SearchResponse<EcsFieldsResponse, Record<string, AggregationsAggregate>>;
}

interface ContainerContext {
  buckets: ContainerBucket[];
}

interface ContainerBucket {
  key: BucketKey;
  doc_count: number;
  container: SearchResponse<EcsFieldsResponse, Record<string, AggregationsAggregate>>;
}

interface Bucket extends Aggs {
  key: BucketKey;
  doc_count: number;
}
interface ResponseAggregations extends Partial<Aggs> {
  groupings?: {
    after_key: Record<string, string>;
    buckets: Bucket[];
  };
  all?: {
    buckets: {
      all?: {
        doc_count: number;
      } & Aggs;
    };
  };
}

const getValue = (aggregatedValue: AggregatedValue, params: MetricExpressionParams) =>
  [Aggregators.P95, Aggregators.P99].includes(params.aggType) && aggregatedValue.values != null
    ? aggregatedValue.values[params.aggType === Aggregators.P95 ? '95.0' : '99.0']
    : aggregatedValue.value;

const NO_DATA_RESPONSE = {
  [UNGROUPED_FACTORY_KEY]: {
    value: null,
    warn: false,
    trigger: false,
    bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
  },
};

const createContainerList = (containerContext: ContainerContext) => {
  return containerContext.buckets
    .map((bucket) => {
      const containerHits = bucket.container.hits?.hits;
      return containerHits?.length > 0 ? containerHits[0]._source?.container : undefined;
    })
    .filter((container) => container !== undefined);
};

export const getData = async (
  esClient: ElasticsearchClient,
  params: MetricExpressionParams,
  index: string,
  groupBy: string | undefined | string[],
  filterQuery: string | undefined,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  timeframe: { start: number; end: number },
  logger: Logger,
  lastPeriodEnd?: number,
  previousResults: GetDataResponse = {},
  afterKey?: Record<string, string>
): Promise<GetDataResponse> => {
  const handleResponse = (
    aggs: ResponseAggregations,
    previous: GetDataResponse,
    successfulShards: number
  ) => {
    // This is absolutely NO DATA
    if (successfulShards === 0) {
      return NO_DATA_RESPONSE;
    }
    if (aggs.groupings) {
      const { groupings } = aggs;
      const nextAfterKey = groupings.after_key;
      for (const bucket of groupings.buckets) {
        const key = Object.values(bucket.key).join(',');
        const {
          shouldWarn,
          shouldTrigger,
          missingGroup,
          currentPeriod,
          aggregatedValue: aggregatedValueForRate,
          additionalContext,
          containerContext,
        } = bucket;

        const { aggregatedValue, doc_count: docCount } = currentPeriod.buckets.all;

        const containerList = containerContext ? createContainerList(containerContext) : undefined;

        const bucketHits = additionalContext?.hits?.hits;
        const additionalContextSource =
          bucketHits && bucketHits.length > 0 ? bucketHits[0]._source : null;

        if (missingGroup && missingGroup.value > 0) {
          previous[key] = {
            trigger: false,
            warn: false,
            value: null,
            bucketKey: bucket.key,
          };
        } else {
          const value =
            params.aggType === Aggregators.COUNT
              ? docCount
              : params.aggType === Aggregators.RATE && aggregatedValueForRate != null
              ? aggregatedValueForRate.value
              : aggregatedValue != null
              ? getValue(aggregatedValue, params)
              : null;

          previous[key] = {
            trigger: (shouldTrigger && shouldTrigger.value > 0) || false,
            warn: (shouldWarn && shouldWarn.value > 0) || false,
            value,
            bucketKey: bucket.key,
            container: containerList,
            ...additionalContextSource,
          };
        }
      }
      if (nextAfterKey) {
        return getData(
          esClient,
          params,
          index,
          groupBy,
          filterQuery,
          compositeSize,
          alertOnGroupDisappear,
          timeframe,
          logger,
          lastPeriodEnd,
          previous,
          nextAfterKey
        );
      }
      return previous;
    }
    if (aggs.all?.buckets.all) {
      const {
        currentPeriod,
        aggregatedValue: aggregatedValueForRate,
        shouldWarn,
        shouldTrigger,
      } = aggs.all.buckets.all;

      const { aggregatedValue, doc_count: docCount } = currentPeriod.buckets.all;

      const value =
        params.aggType === Aggregators.COUNT
          ? docCount
          : params.aggType === Aggregators.RATE && aggregatedValueForRate != null
          ? aggregatedValueForRate.value
          : aggregatedValue != null
          ? getValue(aggregatedValue, params)
          : null;
      // There is an edge case where there is no results and the shouldWarn/shouldTrigger
      // bucket scripts will be missing. This is only an issue for document count because
      // the value will end up being ZERO, for other metrics it will be null. In this case
      // we need to do the evaluation in Node.js
      if (aggs.all && params.aggType === Aggregators.COUNT && value === 0) {
        const trigger = comparatorMap[convertToBuiltInComparators(params.comparator)](
          value,
          params.threshold
        );
        const warn =
          params.warningThreshold && params.warningComparator
            ? comparatorMap[convertToBuiltInComparators(params.warningComparator)](
                value,
                params.warningThreshold
              )
            : false;
        return {
          [UNGROUPED_FACTORY_KEY]: {
            value: trigger || warn ? value : null,
            warn,
            trigger,
            bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
          },
        };
      }
      return {
        [UNGROUPED_FACTORY_KEY]: {
          value,
          warn: (shouldWarn && shouldWarn.value > 0) || false,
          trigger: (shouldTrigger && shouldTrigger.value > 0) || false,
          bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
        },
      };
    } else {
      return NO_DATA_RESPONSE;
    }
  };

  const fieldsExisted = groupBy?.includes(KUBERNETES_POD_UID)
    ? await doFieldsExist(esClient, [termsAggField[KUBERNETES_POD_UID]], index)
    : null;

  const request = {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    ...getElasticsearchMetricQuery(
      params,
      timeframe,
      compositeSize,
      alertOnGroupDisappear,
      lastPeriodEnd,
      groupBy,
      filterQuery,
      afterKey,
      fieldsExisted
    ),
  };
  logger.trace(() => `Request: ${JSON.stringify(request)}`);
  const body = await esClient.search<undefined, ResponseAggregations>(request);
  const { aggregations, _shards } = body;
  logger.trace(() => `Response: ${JSON.stringify(body)}`);
  if (aggregations) {
    return handleResponse(aggregations, previousResults, _shards.successful);
  } else if (_shards.successful) {
    return previousResults;
  }
  return NO_DATA_RESPONSE;
};

const comparatorMap = {
  [COMPARATORS.BETWEEN]: (value: number, [a, b]: number[]) =>
    value >= Math.min(a, b) && value <= Math.max(a, b),
  // `threshold` is always an array of numbers in case the BETWEEN comparator is
  // used; all other compartors will just destructure the first value in the array
  [COMPARATORS.GREATER_THAN]: (a: number, [b]: number[]) => a > b,
  [COMPARATORS.LESS_THAN]: (a: number, [b]: number[]) => a < b,
  [COMPARATORS.NOT_BETWEEN]: (value: number, [a, b]: number[]) => value < a || value > b,
  [COMPARATORS.GREATER_THAN_OR_EQUALS]: (a: number, [b]: number[]) => a >= b,
  [COMPARATORS.LESS_THAN_OR_EQUALS]: (a: number, [b]: number[]) => a <= b,
};
