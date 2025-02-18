/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EsQueryConfig, Filter } from '@kbn/es-query';
import {
  Aggregators,
  CustomMetricExpressionParams,
  SearchConfigurationType,
} from '../../../../../common/custom_threshold_rule/types';
import { getSearchConfigurationBoolQuery } from '../../../../utils/get_parsed_filtered_query';
import { createCustomMetricsAggregations } from './create_custom_metrics_aggregations';
import {
  CONTAINER_ID,
  hasAdditionalContext,
  NUMBER_OF_DOCUMENTS,
  shouldTermsAggOnContainer,
  validGroupByForContext,
} from '../utils';
import { createBucketSelector } from './create_bucket_selector';
import { wrapInCurrentPeriod } from './wrap_in_period';
import { isPopulatedObject } from './is_populated_object';

export const calculateCurrentTimeFrame = (
  metricParams: CustomMetricExpressionParams,
  timeframe: { start: number; end: number }
) => {
  const isRateAgg = metricParams.metrics.some((metric) => metric.aggType === Aggregators.RATE);
  return {
    ...timeframe,
    start: moment(timeframe.end)
      .subtract(
        isRateAgg ? metricParams.timeSize * 2 : metricParams.timeSize,
        metricParams.timeUnit
      )
      .valueOf(),
  };
};

const QueryDslQueryContainerToFilter = (queries: QueryDslQueryContainer[]): Filter[] => {
  return queries.map((query) => ({
    meta: {},
    query,
  }));
};

export const createBoolQuery = (
  timeframe: { start: number; end: number },
  timeFieldName: string,
  searchConfiguration: SearchConfigurationType,
  esQueryConfig: EsQueryConfig,
  additionalQueries: QueryDslQueryContainer[] = []
) => {
  const rangeQuery: QueryDslQueryContainer = {
    range: {
      [timeFieldName]: {
        gte: moment(timeframe.start).toISOString(),
        lte: moment(timeframe.end).toISOString(),
      },
    },
  };
  const filters = QueryDslQueryContainerToFilter([rangeQuery, ...additionalQueries]);

  return getSearchConfigurationBoolQuery(searchConfiguration, filters, esQueryConfig);
};

export const getElasticsearchMetricQuery = (
  metricParams: CustomMetricExpressionParams,
  timeframe: { start: number; end: number },
  timeFieldName: string,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  searchConfiguration: SearchConfigurationType,
  esQueryConfig: EsQueryConfig,
  runtimeMappings?: estypes.MappingRuntimeFields,
  lastPeriodEnd?: number,
  groupBy?: string | string[],
  afterKey?: Record<string, string>,
  fieldsExisted?: Record<string, boolean> | null
) => {
  // We need to make a timeframe that represents the current timeframe as opposed
  // to the total timeframe (which includes the last period).
  const currentTimeFrame = {
    ...calculateCurrentTimeFrame(metricParams, timeframe),
    timeFieldName,
  };

  const metricAggregations = createCustomMetricsAggregations(
    'aggregatedValue',
    metricParams.metrics,
    currentTimeFrame,
    timeFieldName,
    metricParams.equation
  );

  const bucketSelectorAggregations = createBucketSelector(
    metricParams,
    alertOnGroupDisappear,
    timeFieldName,
    groupBy,
    lastPeriodEnd
  );

  const currentPeriod = wrapInCurrentPeriod(currentTimeFrame, metricAggregations);

  const containerIncludesList = ['container.*'];
  const containerExcludesList = [
    'container.cpu',
    'container.memory',
    'container.disk',
    'container.network',
  ];
  const containerContextAgg =
    shouldTermsAggOnContainer(groupBy) && fieldsExisted && fieldsExisted[CONTAINER_ID]
      ? {
          containerContext: {
            terms: {
              field: CONTAINER_ID,
              size: NUMBER_OF_DOCUMENTS,
            },
            aggs: {
              container: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: containerIncludesList,
                    excludes: containerExcludesList,
                  },
                },
              },
            },
          },
        }
      : void 0;

  const includesList = ['host.*', 'labels.*', 'tags', 'cloud.*', 'orchestrator.*'];
  const excludesList = ['host.cpu', 'host.disk', 'host.network'];
  if (!containerContextAgg) {
    includesList.push(...containerIncludesList);
    excludesList.push(...containerExcludesList);
  }

  const additionalContextAgg = hasAdditionalContext(groupBy, validGroupByForContext)
    ? {
        additionalContext: {
          top_hits: {
            size: 1,
            _source: {
              includes: includesList,
              excludes: excludesList,
            },
          },
        },
      }
    : void 0;

  const aggs: any = groupBy
    ? {
        groupings: {
          composite: {
            size: compositeSize,
            sources: Array.isArray(groupBy)
              ? groupBy.map((field, index) => ({
                  [`groupBy${index}`]: {
                    terms: { field },
                  },
                }))
              : [
                  {
                    groupBy0: {
                      terms: {
                        field: groupBy,
                      },
                    },
                  },
                ],
          },
          aggs: {
            ...currentPeriod,
            ...bucketSelectorAggregations,
            ...additionalContextAgg,
            ...containerContextAgg,
          },
        },
      }
    : {
        all: {
          filters: {
            filters: {
              all: {
                match_all: {},
              },
            },
          },
          aggs: {
            ...currentPeriod,
            ...bucketSelectorAggregations,
          },
        },
      };

  if (aggs.groupings && afterKey) {
    aggs.groupings.composite.after = afterKey;
  }

  const query = createBoolQuery(timeframe, timeFieldName, searchConfiguration, esQueryConfig);

  return {
    track_total_hits: true,
    query,
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    size: 0,
    aggs,
  };
};
