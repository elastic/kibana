/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/onechat-common';
import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { alertsTool, SECURITY_ALERTS_TOOL_ID } from './alerts_tool';
import { SECURITY_LABS_SEARCH_TOOL_ID, securityLabsSearchTool } from './security_labs_search_tool';
import {
  attackDiscoverySearchTool,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
} from './attack_discovery_search_tool';
import { entityRiskScoreTool, SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from './entity_risk_score_tool';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.generateEsql,
  // TODO add once product doc tool is merged https://github.com/elastic/kibana/pull/242598
  // platformCoreTools.productDocumentation,
];
export const SECURITY_TOOL_IDS = [
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
];

export const SECURITY_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...SECURITY_TOOL_IDS];

/**
 * Registers all security agent builder tools with the onechat plugin
 */
export const registerTools = async (onechat: OnechatPluginSetup, core: CoreSetup) => {
  onechat.tools.register(entityRiskScoreTool(core));
  onechat.tools.register(attackDiscoverySearchTool());
  onechat.tools.register(securityLabsSearchTool(core));
  onechat.tools.register(alertsTool());
};
