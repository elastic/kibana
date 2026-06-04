/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse, AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewBase, EsQueryConfig } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import type {
  CustomMetricExpressionParams,
  SearchConfigurationType,
} from '../../../../../common/custom_threshold_rule/types';

import { UNGROUPED_FACTORY_KEY } from '../constants';
import type { AdditionalContext } from '../utils';
import { CONTAINER_ID, doFieldsExist, KUBERNETES_POD_UID } from '../utils';
import { getElasticsearchMetricQuery } from './metric_query';

export type GetDataResponse = Record<
  string,
  {
    trigger: boolean;
    value: number | null;
    bucketKey: BucketKey;
    flattenGrouping?: Record<string, string>;
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

interface ElasticsearchErrorCause {
  type?: unknown;
  reason?: unknown;
  root_cause?: unknown;
  caused_by?: unknown;
}

interface ElasticsearchError {
  message?: unknown;
  meta?: {
    body?: {
      error?: unknown;
    };
  };
}

const NO_DATA_RESPONSE = {
  [UNGROUPED_FACTORY_KEY]: {
    value: null,
    trigger: false,
    bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
  },
};

// ES BucketHelpers throws this when top_metrics returns null (no docs); the same prefix appears in
// two other BucketHelpers errors, but only the null-value branch fires for last_value aggs, so the
// .includes() match below is safe.
const LAST_VALUE_NO_DATA_ERROR_REASON =
  'buckets_path must reference either a number value or a single value numeric metric aggregation';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasLastValueNoDataReason = (errorCause: unknown): boolean => {
  if (!isRecord(errorCause)) {
    return false;
  }

  const {
    reason,
    root_cause: rootCause,
    caused_by: causedBy,
  } = errorCause as ElasticsearchErrorCause;
  if (typeof reason === 'string' && reason.includes(LAST_VALUE_NO_DATA_ERROR_REASON)) {
    return true;
  }

  if (Array.isArray(rootCause) && rootCause.some(hasLastValueNoDataReason)) {
    return true;
  }

  return hasLastValueNoDataReason(causedBy);
};

const isLastValueNoDataError = (error: unknown): boolean => {
  if (!isRecord(error)) {
    return false;
  }

  const { message, meta } = error as ElasticsearchError;
  if (typeof message === 'string' && message.includes(LAST_VALUE_NO_DATA_ERROR_REASON)) {
    return true;
  }

  return hasLastValueNoDataReason(meta?.body?.error);
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
  params: CustomMetricExpressionParams,
  index: string,
  timeFieldName: string,
  groupBy: string | undefined | string[],
  searchConfiguration: SearchConfigurationType,
  dataView: DataViewBase | undefined,
  esQueryConfig: EsQueryConfig,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  timeframe: { start: number; end: number },
  logger: Logger,
  runtimeMappings?: estypes.MappingRuntimeFields,
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
      if (groupings.buckets.length === 0 && Object.keys(previous).length === 0) {
        return NO_DATA_RESPONSE;
      }

      for (const bucket of groupings.buckets) {
        const key = Object.values(bucket.key).join(',');
        const { shouldTrigger, missingGroup, currentPeriod, additionalContext, containerContext } =
          bucket;

        const { aggregatedValue } = currentPeriod.buckets.all;

        const containerList = containerContext ? createContainerList(containerContext) : undefined;

        const bucketHits = additionalContext?.hits?.hits;
        const additionalContextSource =
          bucketHits && bucketHits.length > 0 ? bucketHits[0]._source : null;
        const flattenGrouping: Record<string, string> = {};
        const groups: string[] = typeof groupBy === 'string' ? [groupBy] : groupBy ?? [];
        groups.map((group: string, groupIndex) => {
          flattenGrouping[group] = bucket.key[`groupBy${groupIndex}`];
        });

        if (missingGroup && missingGroup.value > 0) {
          previous[key] = {
            trigger: false,
            value: null,
            bucketKey: bucket.key,
            flattenGrouping,
          };
        } else {
          const value = aggregatedValue ? aggregatedValue.value : null;

          previous[key] = {
            trigger: (shouldTrigger && shouldTrigger.value > 0) || false,
            value,
            bucketKey: bucket.key,
            flattenGrouping,
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
          timeFieldName,
          groupBy,
          searchConfiguration,
          dataView,
          esQueryConfig,
          compositeSize,
          alertOnGroupDisappear,
          timeframe,
          logger,
          runtimeMappings,
          lastPeriodEnd,
          previous,
          nextAfterKey
        );
      }
      return previous;
    }
    if (aggs.all?.buckets.all) {
      const { currentPeriod, shouldTrigger } = aggs.all.buckets.all;

      const { aggregatedValue } = currentPeriod.buckets.all;
      const value = aggregatedValue ? aggregatedValue.value : null;
      return {
        [UNGROUPED_FACTORY_KEY]: {
          value,
          trigger: (shouldTrigger && shouldTrigger.value > 0) || false,
          bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
        },
      };
    } else {
      return NO_DATA_RESPONSE;
    }
  };

  const fieldsExisted = groupBy?.includes(KUBERNETES_POD_UID)
    ? await doFieldsExist(esClient, [CONTAINER_ID], index)
    : null;
  const request = {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    ...getElasticsearchMetricQuery(
      params,
      timeframe,
      timeFieldName,
      compositeSize,
      alertOnGroupDisappear,
      searchConfiguration,
      dataView,
      esQueryConfig,
      runtimeMappings,
      lastPeriodEnd,
      groupBy,
      afterKey,
      fieldsExisted
    ),
  };
  let body: SearchResponse<undefined, ResponseAggregations>;
  try {
    body = await esClient.search<undefined, ResponseAggregations>(request);
  } catch (error) {
    if (isLastValueNoDataError(error)) {
      logger.debug(`Swallowed ES bucket_script error for last_value no-data condition: ${error}`);
      return NO_DATA_RESPONSE;
    }
    throw error;
  }

  const { aggregations, _shards } = body;
  if (aggregations) {
    return handleResponse(aggregations, previousResults, _shards.successful);
  } else if (_shards.successful) {
    return previousResults;
  }
  return NO_DATA_RESPONSE;
};
