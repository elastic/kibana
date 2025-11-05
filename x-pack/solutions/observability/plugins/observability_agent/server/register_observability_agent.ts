/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { OBSERVABILITY_REGISTER_OBSERVABILITY_AGENT_ID } from '@kbn/management-settings-ids';
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
import { createObservabilityAlertsTool, OBSERVABILITY_ALERTS_TOOL_ID } from './tools/alerts/alerts';
import {
  createObservabilityGetApmDownstreamDependenciesTool,
  OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
} from './tools/apm/get_downstream_dependencies';
import {
  createObservabilityGetAlertsDatasourceFieldsTool,
  OBSERVABILITY_GET_ALERTS_DATASOURCE_FIELDS_TOOL_ID,
} from './tools/alerts/get_alerts_datasource_fields';
import { getIsObservabilityAgentEnabled } from './utils/get_is_obs_agent_enabled';

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
  OBSERVABILITY_GET_ALERTS_DATASOURCE_FIELDS_TOOL_ID,
  OBSERVABILITY_ALERTS_TOOL_ID,
  OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
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
  const isObservabilityAgentEnabled = await getIsObservabilityAgentEnabled(core);
  if (!isObservabilityAgentEnabled) {
    logger.debug(
      `Skipping observability agent registration because ${OBSERVABILITY_REGISTER_OBSERVABILITY_AGENT_ID} is disabled`
    );
    return;
  }

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

  const observabilityGetAlertsDatasetInfoTool =
    await createObservabilityGetAlertsDatasourceFieldsTool({
      core,
      logger,
    });

  const observabilityAlertsTool = await createObservabilityAlertsTool({
    core,
    logger,
  });

  const observabilityGetApmDownstreamDependenciesTool =
    await createObservabilityGetApmDownstreamDependenciesTool({
      core,
      plugins,
      logger,
    });

  // register tools
  plugins.onechat.tools.register(observabilityGetServicesTool);
  plugins.onechat.tools.register(observabilityGetDataSourcesTool);
  plugins.onechat.tools.register(observabilityRecallKnowledgeBaseTool);
  plugins.onechat.tools.register(observabilityGetAlertsDatasetInfoTool);
  plugins.onechat.tools.register(observabilityAlertsTool);
  plugins.onechat.tools.register(observabilityGetApmDownstreamDependenciesTool);

  // register agent
  plugins.onechat.agents.register({
    id: OBSERVABILITY_AGENT_ID,
    name: OBSERVABILITY_AGENT_NAME,
    description: OBSERVABILITY_AGENT_DESCRIPTION,
    avatar_icon: 'logoObservability',
    configuration: {
      instructions:
        'You are an observability specialist agent.\n' +
        '\n' +
        'Tool usage rules (critical):\n' +
        '1) Alerts workflow: ALWAYS call observability.get_alerts_datasource_fields FIRST to discover relevant fields, then call observability.alerts AFTER it returns. Never call observability.alerts before observability.get_alerts_datasource_fields in a conversation unless the fields have already been retrieved in this conversation.\n' +
        "2) If the user didn't specify a time range for alerts, assume start=now-15m and end=now, and inform the user in the response.\n" +
        '3) Alerts presentation: After observability.alerts returns, present the results in Markdown table format. Use ONLY the fields returned by observability.get_alerts_datasource_fields as table columns. Derive human-friendly column names from field paths (convert `foo.bar.baz` to `Foo Bar Baz`, strip common prefixes like `kibana.alert.` and `service.`). Prefer short, readable labels (e.g., `Status`, `End Time`, `Reason`). Do not invent columns; if a value is missing, leave the cell blank.\n',
      tools: [
        {
          tool_ids: OBSERVABILITY_AGENT_TOOL_IDS,
        },
      ],
    },
  });
}
