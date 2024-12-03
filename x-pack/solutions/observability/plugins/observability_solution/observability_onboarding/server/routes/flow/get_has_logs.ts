/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { termQuery } from '@kbn/observability-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import { AGENT_ID } from '../../../common/es_fields';

export async function getHasLogs(esClient: ElasticsearchClient, agentId: string) {
  try {
    const result = await esClient.search({
      index: ['logs-*', 'metrics-*'],
      ignore_unavailable: true,
      size: 0,
      terminate_after: 1,
      query: {
        bool: {
          filter: termQuery(AGENT_ID, agentId),
        },
      },
    });
    const { value } = result.hits.total as estypes.SearchTotalHits;
    return value > 0;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}
