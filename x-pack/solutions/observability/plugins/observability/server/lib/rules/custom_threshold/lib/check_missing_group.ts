/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EsQueryConfig } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import { isString, get, identity } from 'lodash';
import {
  CustomMetricExpressionParams,
  SearchConfigurationType,
} from '../../../../../common/custom_threshold_rule/types';
import type { BucketKey } from './get_data';
import { calculateCurrentTimeFrame, createBoolQuery } from './metric_query';
import { isPopulatedObject } from './is_populated_object';

export interface MissingGroupsRecord {
  key: string;
  bucketKey: BucketKey;
}

export const checkMissingGroups = async (
  esClient: ElasticsearchClient,
  metricParams: CustomMetricExpressionParams,
  indexPattern: string,
  timeFieldName: string,
  groupBy: string | undefined | string[],
  searchConfiguration: SearchConfigurationType,
  logger: Logger,
  timeframe: { start: number; end: number },
  esQueryConfig: EsQueryConfig,
  missingGroups: MissingGroupsRecord[] = [],
  runtimeMappings?: estypes.MappingRuntimeFields
): Promise<MissingGroupsRecord[]> => {
  if (missingGroups.length === 0) {
    return missingGroups;
  }
  const currentTimeFrame = calculateCurrentTimeFrame(metricParams, timeframe);
  const groupByFields = isString(groupBy) ? [groupBy] : groupBy ? groupBy : [];

  const searches = missingGroups.flatMap((group) => {
    const groupByQueries: QueryDslQueryContainer[] = Object.values(group.bucketKey).map(
      (key, index) => {
        return {
          match: {
            [groupByFields[index]]: key,
          },
        };
      }
    );
    const query = createBoolQuery(
      currentTimeFrame,
      timeFieldName,
      searchConfiguration,
      esQueryConfig,
      groupByQueries
    );

    return [
      { index: indexPattern },
      {
        size: 0,
        terminate_after: 1,
        track_total_hits: true,
        query,
        ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
      },
    ];
  });

  logger.trace(() => `Request: ${JSON.stringify({ searches })}`);
  const response = await esClient.msearch({ searches });
  logger.trace(() => `Response: ${JSON.stringify(response)}`);

  const verifiedMissingGroups = response.responses
    .map((resp, index) => {
      const total = get(resp, 'hits.total.value', 0) as number;
      if (!total) {
        return missingGroups[index];
      }
      return null;
    })
    .filter(identity) as MissingGroupsRecord[];

  return verifiedMissingGroups;
};
