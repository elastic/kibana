/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  MappingRuntimeFields,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryAlertsBodyParams } from '../../../../../../common/api/detection_engine/signals';

interface SearchAlertsProps {
  queryParams: QueryAlertsBodyParams;
  esClient: ElasticsearchClient;
  indexPattern?: string | string[];
}

export const searchAlerts = async ({ queryParams, esClient, indexPattern }: SearchAlertsProps) => {
  const {
    query,
    aggs,
    _source,
    fields,
    track_total_hits: trackTotalHits,
    size,
    runtime_mappings: runtimeMappings,
    sort,
  } = queryParams;

  const result = await esClient.search({
    index: indexPattern,
    query,
    aggs: aggs as Record<string, AggregationsAggregationContainer>,
    _source,
    fields,
    track_total_hits: trackTotalHits,
    size,
    runtime_mappings: runtimeMappings as MappingRuntimeFields,
    sort: sort as Sort,
    ignore_unavailable: true,
  });
  return result;
};
