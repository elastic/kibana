/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';

export const SECURITY_RULE_MONITORING_TOOL_ID = securityTool('rule_monitoring');

const ruleMonitoringSchema = z.object({
  rule_id: z
    .string()
    .optional()
    .describe(
      'Saved object ID of a specific rule to check. Omit to get space-level health overview.'
    ),
  time_range: z
    .string()
    .default('24h')
    .describe('Time range to check, e.g. "1h", "24h", "7d". Defaults to 24h.'),
  include_errors: z.boolean().default(true).describe('Include execution errors in the response.'),
  include_metrics: z
    .boolean()
    .default(true)
    .describe('Include performance metrics (execution duration, search duration).'),
  page: z.number().min(1).default(1).describe('Page number for execution results.'),
  per_page: z.number().min(1).max(100).default(20).describe('Results per page.'),
});

export const ruleMonitoringTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof ruleMonitoringSchema> => {
  return {
    id: SECURITY_RULE_MONITORING_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Monitor detection rule health: check execution errors, performance metrics, and overall detection engine status. Use for a specific rule or space-wide health overview.',
    schema: ruleMonitoringSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        if (!experimentalFeatures?.aiRuleCreationEnabled) {
          return {
            status: 'unavailable',
            reason:
              'AI rule creation is not enabled. Enable it via experimental feature flag "aiRuleCreationEnabled".',
          };
        }
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        rule_id: ruleId,
        time_range: timeRange,
        include_errors: includeErrors,
        include_metrics: includeMetrics,
        page,
        per_page: perPage,
      },
      { esClient }
    ) => {
      logger.debug(
        `${SECURITY_RULE_MONITORING_TOOL_ID} tool called: rule_id=${
          ruleId ?? 'space'
        }, range=${timeRange}`
      );

      try {
        const now = new Date();
        const rangeMatch = timeRange.match(/^(\d+)(h|d|m|w)$/);
        if (!rangeMatch) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: `Invalid time_range format: ${timeRange}. Use e.g. "24h", "7d".` },
              },
            ],
          };
        }

        const amount = parseInt(rangeMatch[1], 10);
        const unit = rangeMatch[2];
        const msMultiplier: Record<string, number> = {
          m: 60 * 1000,
          h: 60 * 60 * 1000,
          d: 24 * 60 * 60 * 1000,
          w: 7 * 24 * 60 * 60 * 1000,
        };
        const start = new Date(now.getTime() - amount * msMultiplier[unit]).toISOString();
        const end = now.toISOString();

        if (ruleId) {
          const execResults = await esClient.asCurrentUser.search({
            index: '.kibana-event-log-*',
            size: perPage ?? 20,
            sort: [{ '@timestamp': { order: 'desc' } }],
            query: {
              bool: {
                must: [
                  { term: { 'rule.id': ruleId } },
                  { term: { 'event.provider': 'alerting' } },
                  { term: { 'event.action': 'execute' } },
                  { range: { '@timestamp': { gte: start, lte: end } } },
                ],
              },
            },
          });

          const events = execResults.hits.hits.map((hit) => {
            const source = hit._source as Record<string, unknown>;
            const eventData = source.event as Record<string, unknown> | undefined;
            const kibanaData = source.kibana as Record<string, unknown> | undefined;
            const alertData = (kibanaData?.alerting as Record<string, unknown>) ?? {};
            const summary = (alertData as Record<string, unknown>).summary as
              | Record<string, unknown>
              | undefined;
            return {
              timestamp: source['@timestamp'] as string,
              status: (eventData?.outcome as string) ?? 'unknown',
              duration_ms: eventData?.duration ? Number(eventData.duration) / 1_000_000 : 0,
              message: source.message as string | undefined,
              new_alerts: ((summary?.new as Record<string, unknown>)?.count as number) ?? 0,
            };
          });

          const errorEvents = events.filter((e) => e.status === 'failure');
          const avgDuration =
            events.length > 0
              ? events.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0) / events.length
              : 0;
          const totalAlerts = events.reduce((sum, e) => sum + (e.new_alerts ?? 0), 0);

          const result: Record<string, unknown> = {
            rule_id: ruleId,
            time_range: timeRange,
            total_executions: execResults.hits.total,
            page,
            per_page: perPage,
          };

          if (includeErrors) {
            result.errors = errorEvents.map((e) => ({
              timestamp: e.timestamp,
              message: e.message,
              status: e.status,
            }));
            result.error_count = errorEvents.length;
          }

          if (includeMetrics) {
            result.metrics = {
              avg_duration_ms: Math.round(avgDuration),
              total_alerts_generated: totalAlerts,
              latest_executions: events.slice(0, 5).map((e) => ({
                timestamp: e.timestamp,
                status: e.status,
                duration_ms: e.duration_ms,
                new_alerts: e.new_alerts,
              })),
            };
          }

          result.message =
            errorEvents.length > 0
              ? `Rule has ${
                  errorEvents.length
                } error(s) in the last ${timeRange}. Average execution: ${Math.round(
                  avgDuration
                )}ms. ${totalAlerts} alert(s) generated.`
              : `Rule is healthy. ${
                  events.length
                } execution(s) in the last ${timeRange}. Average: ${Math.round(
                  avgDuration
                )}ms. ${totalAlerts} alert(s) generated.`;

          return {
            results: [{ type: ToolResultType.other, data: result }],
          };
        }

        const healthResult = await esClient.asCurrentUser.search({
          index: '.kibana-event-log-*',
          size: 0,
          query: {
            bool: {
              must: [
                { term: { 'event.provider': 'alerting' } },
                { term: { 'event.action': 'execute' } },
                { range: { '@timestamp': { gte: start, lte: end } } },
              ],
            },
          },
          aggs: {
            total_rules: { cardinality: { field: 'rule.id' } },
            error_count: {
              filter: { term: { 'event.outcome': 'failure' } },
              aggs: { rule_count: { cardinality: { field: 'rule.id' } } },
            },
          },
        });

        const aggs = healthResult.aggregations as Record<string, unknown> | undefined;
        const totalRulesAgg = aggs?.total_rules as { value?: number } | undefined;
        const errorCountAgg = aggs?.error_count as { rule_count?: { value?: number } } | undefined;
        const totalRules = totalRulesAgg?.value ?? 0;
        const errorRuleCount = errorCountAgg?.rule_count?.value ?? 0;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                scope: 'space',
                time_range: timeRange,
                has_errors: errorRuleCount > 0,
                total_rules_executed: totalRules,
                rules_with_errors: errorRuleCount,
                message:
                  errorRuleCount > 0
                    ? `${errorRuleCount} rule(s) had errors in the last ${timeRange}. Use this tool with a specific rule_id to investigate.`
                    : `Detection engine is healthy. ${totalRules} rules executed without errors in the last ${timeRange}.`,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_RULE_MONITORING_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error checking rule health: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'detection', 'monitoring', 'health'],
  };
};
