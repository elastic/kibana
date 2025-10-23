/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/onechat-common';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from './types';
import {
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  createObservabilityGetServicesTool,
} from './tools/get_services';
import {
  OBSERVABILITY_RECALL_KNOWLEDGE_BASE_TOOL_ID,
  createObservabilityRecallKnowledgeBaseTool,
} from './tools/recall_knowledge_base';
import {
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  createObservabilityGetDataSourcesTool,
} from './tools/get_data_sources';

export const OBSERVABILITY_AGENT_ID = 'platform.core.observability';

export const OBSERVABILITY_AGENT_NAME = 'Observability agent';

export const OBSERVABILITY_AGENT_DESCRIPTION = 'Agent specialized in logs, metrics, and traces';

const OBSERVABILITY_AGENT_TOOL_IDS = [
  // Core platform tools
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.generateEsql,

  // Observability tools
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  OBSERVABILITY_RECALL_KNOWLEDGE_BASE_TOOL_ID,
];

export async function registerObservabilityAgent({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const observabilityGetServicesTool = await createObservabilityGetServicesTool({
    core,
    plugins,
    logger,
  });

  const observabilityGetDataSourcesTool = await createObservabilityGetDataSourcesTool({
    core,
    plugins,
    logger,
  });

  const observabilityRecallKnowledgeBaseTool = await createObservabilityRecallKnowledgeBaseTool({
    core,
    logger,
  });

  // register tools
  plugins.onechat.tools.register(observabilityGetServicesTool);
  plugins.onechat.tools.register(observabilityGetDataSourcesTool);
  plugins.onechat.tools.register(observabilityRecallKnowledgeBaseTool);

  // register agent
  plugins.onechat.agents.register({
    id: OBSERVABILITY_AGENT_ID,
    name: OBSERVABILITY_AGENT_NAME,
    description: OBSERVABILITY_AGENT_DESCRIPTION,
    avatar_icon: 'logoObservability',
    configuration: {
      instructions: 'You are a observability specialist agent',
      tools: [
        {
          tool_ids: OBSERVABILITY_AGENT_TOOL_IDS,
        },
      ],
    },
  });
}
