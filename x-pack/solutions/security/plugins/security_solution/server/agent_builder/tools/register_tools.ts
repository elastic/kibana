/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../common';
import { securityLabsSearchTool } from './security_labs_search_tool';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';
import { entityRiskScoreTool, getEntityTool, searchEntitiesTool } from './entity_analytics';
import { alertsTool } from './alerts_tool';
import { createDetectionRuleTool } from './create_detection_rule_tool';
import { responseActionsTool } from './response_actions_tool';
import { mitreMappingTool } from './mitre_mapping_tool';
import { threatIntelEnrichTool } from './threat_intel_enrich_tool';
import { timelineCreateTool } from './timeline_create_tool';
import { reportGenerateTool } from './report_generate_tool';
import { caseManageTool } from './case_manage_tool';
import { entityStoreQueryTool } from './entity_store_query_tool';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

/**
 * Registers all security agent builder tools with the agentBuilder plugin
 */
export const registerTools = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  endpointAppContextService: EndpointAppContextService
) => {
  agentBuilder.tools.register(entityRiskScoreTool(core, logger));
  agentBuilder.tools.register(attackDiscoverySearchTool(core, logger));
  agentBuilder.tools.register(securityLabsSearchTool(core));
  agentBuilder.tools.register(createDetectionRuleTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(alertsTool(core, logger));
  agentBuilder.tools.register(getEntityTool(core, logger, experimentalFeatures));
  agentBuilder.tools.register(searchEntitiesTool(core, logger, experimentalFeatures));

  // AI SOC tools — gated behind aiSocAgents feature flag
  if (experimentalFeatures.aiSocAgents) {
    agentBuilder.tools.register(responseActionsTool(core, logger, endpointAppContextService));
    agentBuilder.tools.register(mitreMappingTool(core, logger));
    agentBuilder.tools.register(threatIntelEnrichTool(core, logger));
    agentBuilder.tools.register(timelineCreateTool(core, logger));
    agentBuilder.tools.register(reportGenerateTool(core, logger));
    agentBuilder.tools.register(caseManageTool(core, logger));
    agentBuilder.tools.register(entityStoreQueryTool(core, logger));
  }
};
