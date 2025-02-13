/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EsQueryConfig } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import { getIntervalInSeconds } from '../../../../../common/utils/get_interval_in_seconds';
import {
  Aggregators,
  CustomMetricExpressionParams,
  SearchConfigurationType,
} from '../../../../../common/custom_threshold_rule/types';
import { AdditionalContext } from '../utils';
import { createTimerange } from './create_timerange';
import { getData } from './get_data';
import { checkMissingGroups, MissingGroupsRecord } from './check_missing_group';

export interface EvaluatedRuleParams {
  criteria: CustomMetricExpressionParams[];
  groupBy: string | undefined | string[];
  searchConfiguration: SearchConfigurationType;
}

export type Evaluation = CustomMetricExpressionParams & {
  currentValue: number | null;
  timestamp: string;
  shouldFire: boolean;
  isNoData: boolean;
  bucketKey: Record<string, string>;
  context?: AdditionalContext;
};

export const evaluateRule = async <Params extends EvaluatedRuleParams = EvaluatedRuleParams>(
  esClient: ElasticsearchClient,
  params: Params,
  dataView: string,
  timeFieldName: string,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  logger: Logger,
  timeframe: { start: string; end: string },
  esQueryConfig: EsQueryConfig,
  runtimeMappings?: estypes.MappingRuntimeFields,
  lastPeriodEnd?: number,
  missingGroups: MissingGroupsRecord[] = []
): Promise<Array<Record<string, Evaluation>>> => {
  const { criteria, groupBy, searchConfiguration } = params;

  return Promise.all(
    criteria.map(async (criterion) => {
      const interval = `${criterion.timeSize}${criterion.timeUnit}`;
      const intervalAsSeconds = getIntervalInSeconds(interval);
      const intervalAsMS = intervalAsSeconds * 1000;
      const isRateAggregation = criterion.metrics.some(
        (metric) => metric.aggType === Aggregators.RATE
      );
      const calculatedTimerange = createTimerange(
        intervalAsMS,
        timeframe,
        lastPeriodEnd,
        isRateAggregation
      );

      const currentValues = await getData(
        esClient,
        criterion,
        dataView,
        timeFieldName,
        groupBy,
        searchConfiguration,
        esQueryConfig,
        compositeSize,
        alertOnGroupDisappear,
        calculatedTimerange,
        logger,
        runtimeMappings,
        lastPeriodEnd
      );

      const verifiedMissingGroups = await checkMissingGroups(
        esClient,
        criterion,
        dataView,
        timeFieldName,
        groupBy,
        searchConfiguration,
        logger,
        calculatedTimerange,
        esQueryConfig,
        missingGroups,
        runtimeMappings
      );

      for (const missingGroup of verifiedMissingGroups) {
        if (currentValues[missingGroup.key] == null) {
          currentValues[missingGroup.key] = {
            value: null,
            trigger: false,
            bucketKey: missingGroup.bucketKey,
          };
        }
      }

      const evaluations: Record<string, Evaluation> = {};
      for (const key of Object.keys(currentValues)) {
        const result = currentValues[key];
        if (result.trigger || result.value === null) {
          evaluations[key] = {
            ...criterion,
            currentValue: result.value,
            timestamp: moment(calculatedTimerange.end).toISOString(),
            shouldFire: result.trigger,
            isNoData: result.value === null,
            bucketKey: result.bucketKey,
            context: {
              cloud: result.cloud,
              host: result.host,
              container: result.container,
              orchestrator: result.orchestrator,
              labels: result.labels,
              tags: result.tags,
            },
          };
        }
      }
      return evaluations;
    })
  );
};
