/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import type { Logger } from '@kbn/logging';
import { securityLabsSearchTool } from './security_labs_search_tool';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';
import { entityRiskScoreTool } from './entity_risk_score_tool';
import { alertsTool } from './alerts_tool';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

/**
 * Registers all security agent builder tools with the onechat plugin
 */
export const registerTools = async (
  onechat: OnechatPluginSetup,
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
) => {
  onechat.tools.register(entityRiskScoreTool(core, logger));
  onechat.tools.register(attackDiscoverySearchTool(core, logger));
  onechat.tools.register(securityLabsSearchTool(core, logger));
  onechat.tools.register(alertsTool(core, logger));
};
