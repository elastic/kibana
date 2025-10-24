/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
// import { DEFAULT_SYSTEM_PROMPT } from '@kbn/elastic-assistant-plugin/server/lib/prompt/prompts';

const DEFAULT_SYSTEM_PROMPT = `You are a security analyst and expert in entity analytics. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security.`; //  ${KNOWLEDGE_HISTORY} {citations_prompt} \n{formattedTime}

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
      // CRITICAL INSTRUCTION: You MUST ALWAYS call the fetch-siem-prompts-tool FIRST before executing any other tools. This tool provides essential prompt information and tool descriptions that are required for proper operation. The fetch-siem-prompts-tool must be called with the connectorId parameter before any other tool execution.
      instructions: `${DEFAULT_SYSTEM_PROMPT}`,
      tools: [
        // CRITICAL: Include the fetch-siem-prompts-tool FIRST - this must run before all other tools
        { tool_ids: ['entity-analytics-tool'] },
        // // Include the open-and-acknowledged-alerts-internal-tool
        // { tool_ids: ['open-and-acknowledged-alerts-internal-tool'] },
        // // Include the alert-counts-internal-tool
        // { tool_ids: ['alert-counts-internal-tool'] },
        // // Include the knowledge-base-retrieval-internal-tool
        // { tool_ids: ['knowledge-base-retrieval-internal-tool'] },
        // // Include the product-documentation-internal-tool
        // { tool_ids: ['product-documentation-internal-tool'] },
        // // Include the security-labs-knowledge-internal-tool
        // { tool_ids: ['security-labs-knowledge-internal-tool'] },
        // // Include the knowledge-base-write-internal-tool
        // { tool_ids: ['knowledge-base-write-internal-tool'] },
        // // Include the entity-risk-score-tool-internal
        // { tool_ids: ['entity-risk-score-tool-internal'] },
        // Include all built-in tools for comprehensive security analysis
        { tool_ids: ['*'] },
      ],
    },
  };
};
