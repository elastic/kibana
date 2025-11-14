/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/onechat-common';
import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import { alertsTool, SECURITY_ALERTS_TOOL_ID } from './alerts_tool';
import { securityLabsTool, SECURITY_LABS_TOOL_ID } from './security_labs_tool';
import { searchAlertsTool, SEARCH_ALERTS_TOOL_ID } from './search_alerts_tool';
import { triageAlertsTool, TRIAGE_ALERTS_TOOL_ID } from './triage_alerts_tool';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  // TODO add once product doc tool is merged https://github.com/elastic/kibana/pull/242598
  // platformCoreTools.productDocumentation,
];
export const SECURITY_TOOL_IDS = [
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_LABS_TOOL_ID,
  SEARCH_ALERTS_TOOL_ID,
  TRIAGE_ALERTS_TOOL_ID,
];

export const SECURITY_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...SECURITY_TOOL_IDS];

/**
 * Registers all security agent builder tools with the onechat plugin
 */
export const registerTools = (onechat: OnechatPluginSetup): void => {
  onechat.tools.register(alertsTool());
  onechat.tools.register(securityLabsTool());
  onechat.tools.register(searchAlertsTool());
  onechat.tools.register(triageAlertsTool());
};
