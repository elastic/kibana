/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/logging';
import { securityLabsSearchTool } from './security_labs_search_tool';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';
import { entityRiskScoreTool } from './entity_risk_score_tool';
import { alertsTool } from './alerts_tool';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { SecuritySolutionPluginSetupDependencies } from '../../plugin_contract';
import { detectionRulesTool } from './detection_rules_tool';
import { casesTool } from './cases_tool';
import { exceptionListsTool } from './exception_lists_tool';
import { timelinesTool } from './timelines_tool';

/**
 * Registers all security agent builder tools with the agentBuilder plugin
 */
export const registerTools = async (
  agentBuilder: AgentBuilderPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  setupPlugins: SecuritySolutionPluginSetupDependencies
) => {
  agentBuilder.tools.register(entityRiskScoreTool(core, logger));
  agentBuilder.tools.register(attackDiscoverySearchTool(core, logger));
  agentBuilder.tools.register(securityLabsSearchTool(core, logger));
  agentBuilder.tools.register(alertsTool(core, logger));
  agentBuilder.tools.register(detectionRulesTool(core));
  agentBuilder.tools.register(casesTool(core));
  agentBuilder.tools.register(exceptionListsTool({ core, lists: setupPlugins.lists }));
  agentBuilder.tools.register(timelinesTool(core));
};
