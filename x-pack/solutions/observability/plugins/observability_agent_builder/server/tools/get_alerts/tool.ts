/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import { getToolHandler } from './handler';

export const OBSERVABILITY_GET_ALERTS_TOOL_ID = 'observability.get_alerts';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

export const defaultFields = [
  '@timestamp',
  'kibana.alert.start',
  'kibana.alert.end',
  'kibana.alert.flapping',
  'kibana.alert.group',
  'kibana.alert.instance.id',
  'kibana.alert.reason',
  'kibana.alert.rule.category',
  'kibana.alert.rule.name',
  'kibana.alert.rule.tags',
  'kibana.alert.start',
  'kibana.alert.status',
  'kibana.alert.time_range.gte',
  'kibana.alert.time_range.lte',
  'kibana.alert.workflow_status',
  'tags',
  // infra
  'host.name',
  'container.id',
  'kubernetes.pod.name',
  // APM
  'processor.event',
  'service.environment',
  'service.name',
  'service.node.name',
  'transaction.type',
  'transaction.name',
];

const getAlertsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'Filter alerts by field:value pairs. Examples: "service.name: frontend", "host.name: web-*", or "kibana.alert.status: active".'
    ),
  includeRecovered: z
    .boolean()
    .optional()
    .describe(
      'Whether to include recovered/closed alerts. Defaults to false, which means only active alerts will be returned.'
    ),
});

export function createGetAlertsTool({
  core,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  logger: Logger;
}): StaticToolRegistration<typeof getAlertsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getAlertsSchema> = {
    id: OBSERVABILITY_GET_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves Observability alerts within a specified time range.

When to use:
- Checking if there are active alerts for a service or host
- Investigating what triggered during an incident
- Finding alerts related to specific infrastructure or services

Supports filtering by status (active/recovered) and KQL queries.`,
    schema: getAlertsSchema,
    tags: ['observability', 'alerts'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, { request }) => {
      const {
        start = DEFAULT_TIME_RANGE.start,
        end = DEFAULT_TIME_RANGE.end,
        kqlFilter,
        includeRecovered,
      } = toolParams;

      try {
        const { alerts, total } = await getToolHandler({
          core,
          request,
          start,
          end,
          kqlFilter,
          includeRecovered,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total,
                alerts,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching observability alerts: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch observability alerts: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
