/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/onechat-common';
import { SECURITY_ALERTS_TOOL_ID } from './alerts_tool';
import { SECURITY_LABS_TOOL_ID } from './security_labs_tool';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  // TODO add once product doc tool is merged https://github.com/elastic/kibana/pull/242598
  // platformCoreTools.productDocumentation,
];
export const SECURITY_TOOL_IDS = [SECURITY_ALERTS_TOOL_ID, SECURITY_LABS_TOOL_ID];

export const SECURITY_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...SECURITY_TOOL_IDS];
