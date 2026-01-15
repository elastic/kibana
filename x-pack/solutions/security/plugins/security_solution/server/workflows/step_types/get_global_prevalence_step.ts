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
  ruleId: z.string().describe('The rule ID to check global prevalence for'),
  time_range: z.string().optional().default('24h').describe('Time range to query (e.g., "24h", "7d"). Default: "24h"'),
});

const outputSchema = z.object({
  rule_id: z.string(),
  time_range: z.string(),
  total_alerts: z.number(),
  unique_hosts: z.number(),
  unique_users: z.number(),
  prevalence_level: z.enum(['low', 'medium', 'high', 'very_high']),
  top_hosts: z.array(
    z.object({
      host_name: z.string(),
      alert_count: z.number(),
    })
  ),
  message: z.string(),
});

export const getGlobalPrevalenceStepDefinition = createServerStepDefinition({
  id: 'security.getGlobalPrevalence',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId, time_range } = context.input;
      const spaceId = getSpaceIdFromRequest(context.contextManager.getFakeRequest());
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const timeRange = time_range ?? '24h';
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
          unique_hosts: {
            cardinality: {
              field: 'host.name',
            },
          },
          unique_users: {
            cardinality: {
              field: 'user.name',
            },
          },
          total_alerts: {
            value_count: {
              field: '@timestamp',
            },
          },
          hosts_breakdown: {
            terms: {
              field: 'host.name',
              size: 10,
            },
            aggs: {
              alert_count: {
                value_count: {
                  field: '@timestamp',
                },
              },
            },
          },
        },
      });

      const totalAlerts = (searchResponse.aggregations?.total_alerts as any)?.value ?? 0;
      const uniqueHosts = (searchResponse.aggregations?.unique_hosts as any)?.value ?? 0;
      const uniqueUsers = (searchResponse.aggregations?.unique_users as any)?.value ?? 0;
      const hostsBreakdown = (searchResponse.aggregations?.hosts_breakdown as any)?.buckets ?? [];

      const topHosts = hostsBreakdown.map((bucket: any) => ({
        host_name: bucket.key,
        alert_count: bucket.alert_count.value,
      }));

      // Determine prevalence level
      let prevalenceLevel: 'low' | 'medium' | 'high' | 'very_high' = 'low';
      let prevalenceMessage = '';
      if (uniqueHosts >= 50) {
        prevalenceLevel = 'very_high';
        prevalenceMessage = `Very high prevalence: Rule is triggering across ${uniqueHosts} unique hosts. This suggests widespread activity.`;
      } else if (uniqueHosts >= 20) {
        prevalenceLevel = 'high';
        prevalenceMessage = `High prevalence: Rule is triggering across ${uniqueHosts} unique hosts. This suggests significant spread.`;
      } else if (uniqueHosts >= 5) {
        prevalenceLevel = 'medium';
        prevalenceMessage = `Medium prevalence: Rule is triggering across ${uniqueHosts} unique hosts.`;
      } else {
        prevalenceLevel = 'low';
        prevalenceMessage = `Low prevalence: Rule is triggering across ${uniqueHosts} unique host${uniqueHosts !== 1 ? 's' : ''}.`;
      }

      return {
        output: {
          rule_id: ruleId,
          time_range: timeRange,
          total_alerts: totalAlerts,
          unique_hosts: uniqueHosts,
          unique_users: uniqueUsers,
          prevalence_level: prevalenceLevel,
          top_hosts: topHosts,
          message: prevalenceMessage,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get global prevalence', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get global prevalence'),
      };
    }
  },
});

