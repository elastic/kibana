/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/onechat-common';
import type { StaticToolRegistration } from '@kbn/onechat-server';
import {
  OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
} from '@kbn/apm-plugin/common/observability_agent/agent_tool_ids';
import {
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  createGetDataSourcesTool,
} from './get_data_sources/get_data_sources';
import {
  OBSERVABILITY_SEARCH_KNOWLEDGE_BASE_TOOL_ID,
  createSearchKnowledgeBaseTool,
} from './search_knowledge_base/search_knowledge_base';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID, createGetAlertsTool } from './get_alerts/get_alerts';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
];

const OBSERVABILITY_TOOL_IDS = [
  OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
  OBSERVABILITY_SEARCH_KNOWLEDGE_BASE_TOOL_ID,
  OBSERVABILITY_GET_ALERTS_TOOL_ID,
  OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
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
  const observabilityTools: StaticToolRegistration<any>[] = [
    createGetDataSourcesTool({ core, plugins, logger }),
    createSearchKnowledgeBaseTool({ core, logger }),
    createGetAlertsTool({ core, logger }),
  ];

  for (const tool of observabilityTools) {
    plugins.onechat.tools.register(tool);
  }
}
