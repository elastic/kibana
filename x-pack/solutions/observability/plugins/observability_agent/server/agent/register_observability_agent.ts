/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import { OBSERVABILITY_AGENT_TOOL_IDS } from '../tools/register_tools';

export const OBSERVABILITY_AGENT_ID = 'platform.core.observability';

export async function registerObservabilityAgent({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  plugins.onechat.agents.register({
    id: OBSERVABILITY_AGENT_ID,
    name: 'Observability Agent',
    description: 'Agent specialized in logs, metrics, and traces',
    avatar_icon: 'logoObservability',
    configuration: {
      answer: {
        instructions: `${getLinkToKbInstructions(core)}`,
      },
      instructions: 'You are an observability specialist agent',
      tools: [
        {
          tool_ids: OBSERVABILITY_AGENT_TOOL_IDS,
        },
      ],
    },
  });
}

function getLinkToKbInstructions(
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>
) {
  const kibanaPublicBaseUrl = core.http.basePath.publicBaseUrl;

  if (!kibanaPublicBaseUrl) {
    return '';
  }

  const knowledgeBaseLink =
    `${kibanaPublicBaseUrl}/app/management/ai/observabilityAiAssistantManagement?tab=knowledge_base`.replaceAll(
      '//',
      '/'
    );
  const linkToKbInstructions = `Whenever you summarize knowledge base findings to the user, append a markdown link so they can manage entries: [Manage knowledge base](${knowledgeBaseLink}).`;
  return linkToKbInstructions;
}
