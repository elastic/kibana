/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { securityLabsSearchTool } from './security_labs_search_tool';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';
import { entityRiskScoreTool } from './entity_risk_score_tool';
import { alertsTool } from './alerts_tool';

/**
 * Registers all security agent builder tools with the agentBuilder plugin
 */
export const registerTools = async (agentBuilder: AgentBuilderPluginSetup, core: CoreSetup) => {
  agentBuilder.tools.register(entityRiskScoreTool(core));
  agentBuilder.tools.register(attackDiscoverySearchTool(core));
  agentBuilder.tools.register(securityLabsSearchTool(core));
  agentBuilder.tools.register(alertsTool());
};
