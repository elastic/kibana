/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { SECURITY_AGENT_TOOL_IDS } from '../tools/register_tools';

export const SECURITY_AGENT_ID = 'core.security.agent';
export const createSecurityAgent = (): BuiltInAgentDefinition => {
  return {
    id: SECURITY_AGENT_ID,
    avatar_icon: 'logoSecurity',
    name: 'Security Agent',
    description:
      'Agent specialized in security analysis tasks, including alert investigation, threat intelligence, and security documentation.',
    labels: ['security'],
    configuration: {
      instructions: `You are a Security Agent specialized in security analysis and threat intelligence.`,
      tools: [
        {
          tool_ids: SECURITY_AGENT_TOOL_IDS,
        },
      ],
    },
  };
};
