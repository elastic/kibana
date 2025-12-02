/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { internalNamespaces } from '@kbn/onechat-common/base/namespaces';
import { platformCoreTools } from '@kbn/onechat-common';
import { SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID, SECURITY_LABS_SEARCH_TOOL_ID } from '../tools';
import { SECURITY_ALERTS_TOOL_ID } from '../tools/alerts_tool';

export const SECURITY_ALERTS_AGENT_ID = `${internalNamespaces.security}.alerts`;
export const createSecurityAgent = (): BuiltInAgentDefinition => {
  return {
    id: SECURITY_ALERTS_AGENT_ID,
    avatar_icon: 'logoSecurity',
    name: 'Alerts Agent',
    description:
      'Agent specialized in security alert analysis tasks, including alert investigation and security documentation.',
    labels: ['security'],
    configuration: {
      instructions: `You are a Security Agent specialized in security analysis and threat intelligence.`,
      tools: [
        {
          tool_ids: [
            SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
            SECURITY_LABS_SEARCH_TOOL_ID,
            SECURITY_ALERTS_TOOL_ID,
            platformCoreTools.cases,
            // 'platformCoreTools.productDocumentation',
          ],
        },
      ],
    },
  };
};
