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

export const mergeTopNodesResponses = (
  responses: TopNodesResponse[],
  size: number
): TopNodesResponse => {
  const hostMap = new Map<string, TopNodesResponse['series'][number]>();

  for (const { series } of responses) {
    for (const entry of series) {
      if (!hostMap.has(entry.id)) {
        hostMap.set(entry.id, entry);
      }
    }
  }

  const merged = Array.from(hostMap.values());
  return { series: merged.slice(0, size) };
};

export const queryTopNodes = async (
  options: TopNodesRequest,
  client: ESSearchClient,
  source: MetricsSourceConfiguration,
  schemas: DataSchemaFormat[] = ['ecs']
): Promise<TopNodesResponse> => {
  if (schemas.length === 1) {
    return queryTopNodesForSchema(options, client, source, schemas[0]);
  }

  const responses = await Promise.all(
    schemas.map((schema) => queryTopNodesForSchema(options, client, source, schema))
  );

  return mergeTopNodesResponses(responses, options.size);
};
