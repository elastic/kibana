/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID to get fire count for'),
  timestamp: z
    .string()
    .optional()
    .describe(
      'ISO timestamp used as the center of the time window. If omitted, the current time (now) is used.'
    ),
  time_window: z
    .string()
    .optional()
    .default('1h')
    .describe(
      'Symmetric window applied before and after the timestamp (e.g., "1h", "24h", "7d"). Fire count is calculated from [timestamp - time_window] to [timestamp + time_window]. E.g. "1h" means look back 1h and forward 1h. Default: "1h"'
    ),
});

const outputSchema = z.object({
  rule_id: z.string(),
  count: z.number(),
  time_window: z.string(),
  message: z.string(),
});

export const getRuleFireCountInputSchema = inputSchema;

export const getRuleFireCountStepDefinition = createServerStepDefinition({
  id: 'security.getRuleFireCount',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId, timestamp, time_window } = context.input;
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const timeWindow = time_window ?? '1h';
      const esClient = context.contextManager.getScopedEsClient();

      // Symmetric window: [anchor - time_window, anchor + time_window]
      const anchor = timestamp?.trim() || undefined;
      const rangeGte = anchor ? `${anchor}||-${timeWindow}` : `now-${timeWindow}`;
      const rangeLte = anchor ? `${anchor}||+${timeWindow}` : `now+${timeWindow}`;

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
                    gte: rangeGte,
                    lte: rangeLte,
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
          time_window: timeWindow,
          message: `Rule ${ruleId} fired ${totalCount} time${
            totalCount !== 1 ? 's' : ''
          } in the ±${timeWindow} window.`,
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
