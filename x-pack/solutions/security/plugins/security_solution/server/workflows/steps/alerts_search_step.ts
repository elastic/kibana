/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { alertsSearchStepCommonDefinition } from '../../../common/workflows/steps';

export const alertsSearchStepDefinition = createServerStepDefinition({
  ...alertsSearchStepCommonDefinition,
  handler: async (context) => {
    const { query, size = 0, sort, index } = context.input;
    const esClient = context.contextManager.getScopedEsClient();

    const spaceId = context.contextManager.getContext().workflow?.spaceId ?? 'default';
    const alertsIndex = index ?? `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

    try {
      const result = await esClient.search({
        index: alertsIndex,
        query: (query as QueryDslQueryContainer) ?? { match_all: {} },
        size,
        sort: sort as SortCombinations[],
        ignore_unavailable: true,
        track_total_hits: true,
      });

      const total =
        typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;

      const hits: Array<Record<string, unknown>> = result.hits.hits.map(
        (hit) => (hit._source as Record<string, unknown>) ?? {}
      );

      context.logger.info(`Alerts search completed`, { total, hitsReturned: hits.length });

      return {
        output: { total, hits },
      };
    } catch (error) {
      context.logger.error(
        'Failed to search alerts',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to search security alerts'
        ),
      };
    }
  },
});
