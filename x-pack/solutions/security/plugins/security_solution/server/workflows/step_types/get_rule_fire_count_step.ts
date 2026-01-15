/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getSpaceIdFromRequest } from '../../agent_builder/tools/helpers';

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID to get fire count for'),
  time_range: z.string().optional().default('1h').describe('Time range to query (e.g., "1h", "24h", "7d"). Default: "1h"'),
});

const outputSchema = z.object({
  rule_id: z.string(),
  count: z.number(),
  time_range: z.string(),
  message: z.string(),
});

export const getRuleFireCountStepDefinition = createServerStepDefinition({
  id: 'security.getRuleFireCount',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId, time_range } = context.input;
      const spaceId = getSpaceIdFromRequest(context.contextManager.getFakeRequest());
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const timeRange = time_range ?? '1h';
      const esClient = context.contextManager.getScopedEsClient();

      const searchResponse = await esClient.search({
        index: alertsIndex,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'kibana.alert.rule.uuid': ruleId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: `now-${timeRange}`,
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
      });

      const count = searchResponse.hits.total;
      const totalCount = typeof count === 'number' ? count : count?.value ?? 0;

      return {
        output: {
          rule_id: ruleId,
          count: totalCount,
          time_range: timeRange,
          message: `Rule ${ruleId} fired ${totalCount} time${totalCount !== 1 ? 's' : ''} in the last ${timeRange}.`,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get rule fire count', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get rule fire count'),
      };
    }
  },
});

