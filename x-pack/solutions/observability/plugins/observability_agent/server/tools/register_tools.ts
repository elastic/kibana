/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/onechat-common';
import type { StaticToolRegistration } from '@kbn/onechat-server';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID, createGetServicesTool } from './get_services';
import {
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  createGetDataSourcesTool,
} from './get_data_sources';
import {
  OBSERVABILITY_RECALL_KNOWLEDGE_BASE_TOOL_ID,
  createRecallKnowledgeBaseTool,
} from './recall_knowledge_base/recall_knowledge_base';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.generateEsql,
];

const OBSERVABILITY_TOOL_IDS = [
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  OBSERVABILITY_RECALL_KNOWLEDGE_BASE_TOOL_ID,
];

export const OBSERVABILITY_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...OBSERVABILITY_TOOL_IDS];

export async function registerTools({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const observabilityTools: StaticToolRegistration<any>[] = await Promise.all([
    createGetServicesTool({ core, plugins, logger }),
    createGetDataSourcesTool({ core, plugins, logger }),
    createRecallKnowledgeBaseTool({ core, logger }),
  ]);

  for (const tool of observabilityTools) {
    plugins.onechat.tools.register(tool);
  }
}
