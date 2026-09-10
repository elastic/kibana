/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESSearchClient } from '@kbn/metrics-data-access-plugin/server';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { TopNodesRequest, TopNodesResponse } from '../../../../common/http_api/overview_api';
import type { MetricsSourceConfiguration } from '../../../../common/metrics_sources';
import { DEFAULT_SCHEMA } from '../../../../common/constants';
import { convertESResponseToTopNodesResponse } from './convert_es_response_to_top_nodes_response';
import { createTopNodesQuery } from './create_top_nodes_query';
import type { ESResponseForTopNodes } from './types';

const queryTopNodesForSchema = async (
  options: TopNodesRequest,
  client: ESSearchClient,
  source: MetricsSourceConfiguration,
  schema: DataSchemaFormat
): Promise<TopNodesResponse> => {
  const params = {
    index: source.configuration.metricAlias,
    body: createTopNodesQuery(options, source, schema),
  };

  const response = await client<{}, ESResponseForTopNodes>(params);
  return convertESResponseToTopNodesResponse(response);
};

const SORTABLE_METRIC_KEYS = new Set(['cpu', 'iowait', 'load', 'uptime', 'rx', 'tx']);

type SeriesEntry = TopNodesResponse['series'][number];
type SortableMetricKey = 'cpu' | 'iowait' | 'load' | 'uptime' | 'rx' | 'tx';

export const mergeTopNodesResponses = (
  responses: TopNodesResponse[],
  options: Pick<TopNodesRequest, 'size' | 'sort' | 'sortDirection'>
): TopNodesResponse => {
  const hostMap = new Map<string, SeriesEntry>();

  for (const { series } of responses) {
    for (const entry of series) {
      if (!hostMap.has(entry.id)) {
        hostMap.set(entry.id, entry);
      }
    }
  }

  const merged = Array.from(hostMap.values());
  const direction = options.sortDirection === 'desc' ? -1 : 1;

  if (options.sort === 'name') {
    merged.sort((a, b) => direction * (a.name ?? '').localeCompare(b.name ?? ''));
  } else {
    const sortKey: SortableMetricKey = SORTABLE_METRIC_KEYS.has(options.sort ?? '')
      ? (options.sort as SortableMetricKey)
      : 'load';
    merged.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return direction * (aVal - bVal);
    });
  }

  return { series: merged.slice(0, options.size) };
};

export const queryTopNodes = async (
  options: TopNodesRequest,
  client: ESSearchClient,
  source: MetricsSourceConfiguration,
  schemas: DataSchemaFormat[] = [DEFAULT_SCHEMA]
): Promise<TopNodesResponse> => {
  if (schemas.length === 1) {
    return queryTopNodesForSchema(options, client, source, schemas[0]);
  }

  const results = await Promise.allSettled(
    schemas.map((schema) => queryTopNodesForSchema(options, client, source, schema))
  );

  const successfulResponses = results
    .filter((r): r is PromiseFulfilledResult<TopNodesResponse> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (successfulResponses.length === 0) {
    const firstRejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw firstRejected?.reason ?? new Error('All schema queries failed');
  }

  return mergeTopNodesResponses(successfulResponses, options);
};
