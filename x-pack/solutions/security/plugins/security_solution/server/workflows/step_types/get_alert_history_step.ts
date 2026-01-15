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
  ruleId: z.string().describe('The rule ID to get alert history for'),
  time_range: z.string().optional().default('7d').describe('Time range to query (e.g., "7d", "24h", "30d"). Default: "7d"'),
});

const outputSchema = z.object({
  rule_id: z.string(),
  time_range: z.string(),
  total_alerts: z.number(),
  history: z.array(
    z.object({
      timestamp: z.string(),
      count: z.number(),
    })
  ),
  message: z.string(),
});

export const getAlertHistoryStepDefinition = createServerStepDefinition({
  id: 'security.getAlertHistory',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId, time_range } = context.input;
      const spaceId = getSpaceIdFromRequest(context.contextManager.getFakeRequest());
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const timeRange = time_range ?? '7d';
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
        aggs: {
          alerts_over_time: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1h',
              extended_bounds: {
                min: `now-${timeRange}`,
                max: 'now',
              },
              min_doc_count: 0,
            },
          },
          total_alerts: {
            value_count: {
              field: '@timestamp',
            },
          },
        },
      });

      const totalCount = typeof searchResponse.hits.total === 'number' 
        ? searchResponse.hits.total 
        : searchResponse.hits.total?.value ?? 0;

      const buckets = (searchResponse.aggregations?.alerts_over_time as any)?.buckets ?? [];
      const history = buckets.map((bucket: any) => ({
        timestamp: bucket.key_as_string ?? new Date(bucket.key).toISOString(),
        count: bucket.doc_count,
      }));

      return {
        output: {
          rule_id: ruleId,
          time_range: timeRange,
          total_alerts: totalCount,
          history: history,
          message: `Rule ${ruleId} fired ${totalCount} time${totalCount !== 1 ? 's' : ''} in the last ${timeRange}.`,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get alert history', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get alert history'),
      };
    }
  },
});

