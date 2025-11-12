/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

export const createSecurityAgentDefinition = (): BuiltInAgentDefinition => {
  return {
    id: 'core.security.agent',
    avatar_icon: 'logoSecurity',
    name: 'Security Agent',
    description:
      'Agent specialized in security analysis tasks, including alert investigation, threat intelligence, and security documentation.',
    labels: ['security'],
    configuration: {
      instructions: `You are a Security Agent specialized in security analysis and threat intelligence.`,
      tools: [
        {
          tool_ids: [
            'core.security.alerts',
            'core.security.security_labs',
            // TODO add once product doc tool is merged https://github.com/elastic/kibana/pull/242598
            // 'platform.core.product_documentation',
          ],
        },
      ],
    },
  };
};
