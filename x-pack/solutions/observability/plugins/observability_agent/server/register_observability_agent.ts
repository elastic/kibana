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
} from './tools/observability_get_services';
import {
  OBSERVABILITY_EXECUTE_PATHS_TOOL_ID,
  createObservabilityExecutePathsTool,
} from './tools/observability_execute_paths';
import { PathToolClient } from './path_tool_client';
import { PATH_EXAMPLE, RETRIEVE_ES_DOC } from './path_tool_client/example_path';
import {
  OBSERVABILITY_ELASTICSEARCH_API_TOOL_ID,
  createObservabilityElasticsearchApiTool,
} from './tools/es_api';
import {
  OBSERVABILITY_KIBANA_TOOL_ID,
  createObservabilityKibanaTool,
} from './tools/observability_kibana';
import {
  OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
  createObservabilityElasticsearchTool,
} from './tools/observability_elasticsearch';

export const OBSERVABILITY_AGENT_ID = 'platform.core.observability';

export const OBSERVABILITY_AGENT_NAME = 'Observability agent';

export const OBSERVABILITY_AGENT_DESCRIPTION = 'Agent specialized in logs, metrics, and traces';

const OBSERVABILITY_AGENT_TOOL_IDS = [
  // Core platform tools
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,

  // Observability tools
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_EXECUTE_PATHS_TOOL_ID,
  OBSERVABILITY_ELASTICSEARCH_API_TOOL_ID,
  OBSERVABILITY_KIBANA_TOOL_ID,
  OBSERVABILITY_ELASTICSEARCH_TOOL_ID,
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

  const observabilityKibanaTool = await createObservabilityKibanaTool({
    core,
    plugins,
    logger,
    observabilityPathToolClient: new PathToolClient(),
  });

  const observabilityElasticsearchTool = await createObservabilityElasticsearchTool({
    core,
    plugins,
    logger,
    observabilityPathToolClient: new PathToolClient(),
  });

  const observabilityElasticsearchApiTool = await createObservabilityElasticsearchApiTool({
    core,
    plugins,
    logger,
  });

  const observabilityPathToolClient = new PathToolClient();
  observabilityPathToolClient.registerPath(PATH_EXAMPLE);
  observabilityPathToolClient.registerPath(RETRIEVE_ES_DOC);

  const observabilityExecutePathsTool = await createObservabilityExecutePathsTool({
    core,
    plugins,
    logger,
    observabilityPathToolClient,
  });

  // register tools
  plugins.onechat.tools.register(observabilityGetServicesTool);
  plugins.onechat.tools.register(observabilityExecutePathsTool);
  plugins.onechat.tools.register(observabilityElasticsearchApiTool);
  plugins.onechat.tools.register(observabilityKibanaTool);
  plugins.onechat.tools.register(observabilityElasticsearchTool);

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
