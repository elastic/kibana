/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { internalNamespaces } from '@kbn/onechat-common/base/namespaces';
import { platformCoreTools } from '@kbn/onechat-common';
import {
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
} from '../tools';

export const ENTITY_AGENT_ID = `${internalNamespaces.security}.entity`;

export const createEntityAgent = (): BuiltInAgentDefinition => {
  return {
    id: ENTITY_AGENT_ID,
    avatar_icon: 'logoSecurity',
    name: 'Entity Agent',
    description: 'Agent specialized in security entities including hosts, users, and services.',
    labels: ['security'],
    configuration: {
      instructions: `You are an Agent specialized in security entity analysis.`,
      tools: [
        {
          tool_ids: [
            SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
            SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
            SECURITY_LABS_SEARCH_TOOL_ID,
            SECURITY_ALERTS_TOOL_ID,
            platformCoreTools.cases,
          ],
        },
      ],
    },
  };
};
