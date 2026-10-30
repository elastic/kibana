/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SignificantEventsServer } from '../../types';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { SignificantEventsMaintenanceService } from '../../lib/maintenance/maintenance_service';
import type { GetScopedClients } from '../../routes/types';
import { createFeatureSimilaritySearchTool } from './feature_similarity_search/tool';
import { createFeatureKnowledgeIndicatorTool } from './create_feature_knowledge_indicator/tool';
import { createQueryKnowledgeIndicatorTool } from './create_query_knowledge_indicator/tool';
import { createSearchKnowledgeIndicatorsTool } from './search_knowledge_indicators/tool';
import { createSearchEventsTool } from './event_search/tool';
import { createEventTool } from './event_create/tool';
import { createEventStatusUpdateTool } from './event_status_update/tool';
import { createEventInvestigationAttachTool } from './event_investigation_attach/tool';
import { createEventsWriteTool } from './event_write/tool';
import { createSourceListTool } from './source_list/tool';
import { createSourceGetTool } from './source_get/tool';
import { createSourceCreateTool } from './source_create/tool';
import { createSourceUpdateTool } from './source_update/tool';
import { createSourceDeleteTool } from './source_delete/tool';
export {
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
  SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_INVESTIGATION_ATTACH_TOOL_ID,
  SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID,
  NIGHTSHIFT_SOURCE_LIST_TOOL_ID,
  NIGHTSHIFT_SOURCE_GET_TOOL_ID,
  NIGHTSHIFT_SOURCE_CREATE_TOOL_ID,
  NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID,
  NIGHTSHIFT_SOURCE_DELETE_TOOL_ID,
} from './tool_ids';

export function registerAgentBuilderTools({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
  maintenanceService,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  maintenanceService: Pick<SignificantEventsMaintenanceService, 'getState'>;
}): void {
  if (!agentBuilder) {
    return;
  }

  const tools = [
    // Significant events tools
    createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger: logger.get('ki_search_tool'),
    }),
    createFeatureSimilaritySearchTool({
      getScopedClients,
      server,
      logger: logger.get('ki_feature_similarity_search_tool'),
    }),
    createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger: logger.get('ki_feature_create_tool'),
      telemetry,
    }),
    createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger: logger.get('ki_query_create_tool'),
      telemetry,
    }),
    createSearchEventsTool({
      getScopedClients,
      server,
      logger: logger.get('event_search_tool'),
      telemetry,
    }),
    createEventTool({
      getScopedClients,
      server,
      logger: logger.get('event_create_tool'),
      telemetry,
    }),
    createEventStatusUpdateTool({
      getScopedClients,
      server,
      logger: logger.get('event_status_update_tool'),
      telemetry,
    }),
    createEventInvestigationAttachTool({
      getScopedClients,
      server,
      logger: logger.get('event_investigation_attach_tool'),
      telemetry,
    }),
    createEventsWriteTool({
      getScopedClients,
      server,
      logger: logger.get('events_write_tool'),
      telemetry,
    }),
    // Nightshift source tools
    createSourceListTool({
      getScopedClients,
      server,
      logger: logger.get('source_list_tool'),
    }),
    createSourceGetTool({
      getScopedClients,
      server,
      logger: logger.get('source_get_tool'),
    }),
    createSourceCreateTool({
      getScopedClients,
      server,
      logger: logger.get('source_create_tool'),
      maintenanceService,
    }),
    createSourceUpdateTool({
      getScopedClients,
      server,
      logger: logger.get('source_update_tool'),
      maintenanceService,
    }),
    createSourceDeleteTool({
      getScopedClients,
      server,
      logger: logger.get('source_delete_tool'),
    }),
  ];

  for (const tool of tools) {
    agentBuilder.tools.register(tool as Parameters<typeof agentBuilder.tools.register>[0]);
  }
}
