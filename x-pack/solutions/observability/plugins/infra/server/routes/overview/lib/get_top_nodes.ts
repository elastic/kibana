/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TopNodesRequest } from '../../../../common/http_api/overview_api';
import { MetricsSourceConfiguration } from '../../../../common/metrics_sources';
import { ESSearchClient } from '../../../lib/metrics/types';
import { convertESResponseToTopNodesResponse } from './convert_es_response_to_top_nodes_response';
import { createTopNodesQuery } from './create_top_nodes_query';
import { ESResponseForTopNodes } from './types';

export const queryTopNodes = async (
  options: TopNodesRequest,
  client: ESSearchClient,
  source: MetricsSourceConfiguration
) => {
  const params = {
    index: source.configuration.metricAlias,
    body: createTopNodesQuery(options, source),
  };

  const response = await client<{}, ESResponseForTopNodes>(params);
  return convertESResponseToTopNodesResponse(response);
};
