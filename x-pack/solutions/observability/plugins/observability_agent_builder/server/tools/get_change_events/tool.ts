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
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { timeRangeSchemaOptional } from '../../utils/tool_schemas';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { ALL_CHANGE_TYPES, DEFAULT_CHANGE_EVENT_FIELDS } from './constants';
import { getChangeEventsHandler } from './handler';

export const OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID = 'observability.get_change_events';

const DEFAULT_TIME_RANGE = {
  start: 'now-1h',
  end: 'now',
};

const getChangeEventsSchema = z.object({
  ...timeRangeSchemaOptional(DEFAULT_TIME_RANGE),
  serviceName: z
    .string()
    .optional()
    .describe(
      'Filter events by service name. Note: CI/CD pipeline traces may report the CI agent name (e.g., "github-actions") rather than the deployed service.'
    ),
  environment: z
    .string()
    .optional()
    .describe(
      'Filter events by deployment environment (e.g., production, staging). Supports both ECS (service.environment) and OTel (deployment.environment.name) conventions.'
    ),
  changeTypes: z
    .array(z.enum(['deployment', 'configuration', 'feature_flag', 'scaling']))
    .optional()
    .describe(
      'Types of change events to retrieve. Defaults to all. Options: "deployment" (K8s rollouts, CI/CD pipelines), "configuration" (ConfigMap syncs), "feature_flag" (flag evaluations), "scaling" (HPA events). Use specific types to reduce noise during incident investigation.'
    ),
  kqlFilter: z
    .string()
    .optional()
    .describe(
      'Optional KQL filter for LOG events only. Does not apply to CI/CD traces. Example: "message: *rollback*" or "k8s.deployment.name: checkout*".'
    ),
  changeEventFields: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of fields to return for each event. If not provided, a default set of common change fields is returned.'
    ),
});

export function createGetChangeEventsTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getChangeEventsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getChangeEventsSchema> = {
    id: OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves recent system changes—deployments, configuration updates, feature flag toggles, and scaling events—to answer "What changed?" during an incident.

Use this tool when:
- Investigating a spike in errors or latency to find correlating changes
- Verifying a deployment rollout completed successfully
- Auditing which feature flags or configs were modified in a time window

This tool searches BOTH logs (K8s events, ConfigMap syncs, unstructured messages) AND traces (CI/CD pipeline spans from Jenkins, GitHub Actions, etc.) using OpenTelemetry Semantic Conventions and Elastic Common Schema (ECS).

The response includes a human-readable summary, individual change events sorted newest-first, and version transitions showing only versions that were NEWLY deployed within the time window.`,
    schema: getChangeEventsSchema,
    tags: ['observability', 'changes', 'deployments', 'events'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      {
        start = DEFAULT_TIME_RANGE.start,
        end = DEFAULT_TIME_RANGE.end,
        serviceName,
        environment,
        changeTypes = [...ALL_CHANGE_TYPES],
        kqlFilter,
        changeEventFields = DEFAULT_CHANGE_EVENT_FIELDS,
      },
      context
    ) => {
      try {
        const result = await getChangeEventsHandler({
          esClient: context.esClient,
          core,
          plugins,
          logger,
          start,
          end,
          serviceName,
          environment,
          changeTypes,
          kqlFilter,
          changeEventFields,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                ...result,
                note:
                  result.total === 0
                    ? "No change events found. This tool searches both logs and traces indices. For deployments, ensure your OTel collector is emitting CI/CD spans with 'cicd.pipeline.*' attributes (from OTel Jenkins/GitHub plugins), or K8s events with 'k8s.event.reason', or ECS 'event.category' fields in logs."
                    : undefined,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching change events: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch change events: ${error.message}`,
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
