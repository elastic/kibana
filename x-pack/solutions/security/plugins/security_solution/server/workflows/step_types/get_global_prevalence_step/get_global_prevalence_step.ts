/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';

interface NumericValueAggregation {
  value?: number;
}

interface HostsBreakdownBucket {
  key: string;
  alert_count?: NumericValueAggregation;
}

interface GlobalPrevalenceAggregations {
  unique_hosts?: NumericValueAggregation;
  unique_users?: NumericValueAggregation;
  total_alerts?: NumericValueAggregation;
  hosts_breakdown?: { buckets: HostsBreakdownBucket[] | Record<string, HostsBreakdownBucket> };
}

const inputSchema = z.object({
  ruleId: z.string().describe('The rule ID to check global prevalence for'),
  timestamp: z
    .string()
    .optional()
    .describe(
      'ISO timestamp used as the end of the lookback window. If omitted, the current time (now) is used.'
    ),
  time_range: z
    .string()
    .optional()
    .default('24h')
    .describe(
      'Lookback window subtracted from the timestamp (e.g., "24h", "7d"). Prevalence is calculated from [timestamp - time_range] to [timestamp]. Default: "24h".'
    ),
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

export const getGlobalPrevalenceInputSchema = inputSchema;

export const getGlobalPrevalenceStepDefinition = createServerStepDefinition({
  id: 'security.getGlobalPrevalence',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { ruleId, timestamp, time_range } = context.input;
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const timeRange = time_range ?? '24h';
      const esClient = context.contextManager.getScopedEsClient();

      // Lookback window ending at timestamp (or now if omitted)
      const anchor = timestamp?.trim() || undefined;
      const rangeGte = anchor ? `${anchor}||-${timeRange}` : `now-${timeRange}`;
      const rangeLte = anchor ?? 'now';

      const searchResponse = await esClient.search<unknown, GlobalPrevalenceAggregations>({
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

      const aggregations = searchResponse.aggregations;
      const totalAlerts = aggregations?.total_alerts?.value ?? 0;
      const uniqueHosts = aggregations?.unique_hosts?.value ?? 0;
      const uniqueUsers = aggregations?.unique_users?.value ?? 0;

      const rawHostsBuckets = aggregations?.hosts_breakdown?.buckets ?? [];
      const hostsBreakdown = Array.isArray(rawHostsBuckets)
        ? rawHostsBuckets
        : Object.values(rawHostsBuckets);

      const topHosts = hostsBreakdown
        .map((bucket) => ({
          host_name: bucket.key,
          alert_count: bucket.alert_count?.value ?? 0,
        }))
        .filter((h) => typeof h.host_name === 'string' && h.host_name.length > 0);

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
        prevalenceMessage = `Low prevalence: Rule is triggering across ${uniqueHosts} unique host${
          uniqueHosts !== 1 ? 's' : ''
        }.`;
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
        error: new Error(
          error instanceof Error ? error.message : 'Failed to get global prevalence'
        ),
      };
    }
  },
});
