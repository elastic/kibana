/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

const DEFAULT_SYSTEM_PROMPT = `You are a security analyst and expert in entity analytics. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security.
* Use the following index patterns to retrieve information from logs: apm-*-transaction*, auditbeat-*, endgame-*, filebeat-*, logs-*, packetbeat-*, traces-apm*, winlogbeat-*, -*elastic-cloud-logs-*
`; // TODO: remove hard coded index patterns

/**
 * Creates the SIEM Security Analyst agent definition for the new registry mechanism.
 * This agent is registered at setup time and provides security-focused capabilities.
 */
export const entityAnalyticsAgentCreator = (): BuiltInAgentDefinition => {
  return {
    id: 'siem-entity-analytics',
    name: 'Entity Analytics Agent',
    description: DEFAULT_SYSTEM_PROMPT,
    labels: ['security', 'entity-analytics'],
    avatar_color: '#ff6b6b',
    avatar_symbol: '🛡️',
    configuration: {
      instructions: `${DEFAULT_SYSTEM_PROMPT}`,
      // TODO general security solution information, like the dataviews and index patterns, but at this point we don't have access to the space.

      tools: [
        { tool_ids: ['entity-analytics-tool'] },
        // Include all built-in tools for comprehensive security analysis
        { tool_ids: ['*'] },
      ],
    },
  };
};
