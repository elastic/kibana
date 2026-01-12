/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStartDependencies,
  ObservabilityAgentBuilderPluginStart,
} from '../types';
import { OBSERVABILITY_AGENT_TOOL_IDS } from '../tools/register_tools';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

export const OBSERVABILITY_AGENT_ID = 'observability.agent';

export async function registerObservabilityAgent({
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
}) {
  plugins.agentBuilder?.agents.register({
    id: OBSERVABILITY_AGENT_ID,
    name: 'Observability Agent',
    description: 'Agent specialized in logs, metrics, and traces',
    avatar_icon: 'logoObservability',
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    configuration: {
      instructions: 'You are an observability specialist agent.\n',
      tools: [
        {
          tool_ids: OBSERVABILITY_AGENT_TOOL_IDS,
        },
      ],
    },
  });

  logger.debug('Successfully registered observability agent in agent-builder');
}
