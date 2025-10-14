/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { DEFAULT_SYSTEM_PROMPT } from '@kbn/elastic-assistant-plugin/server/lib/prompt/prompts';

/**
 * Creates the SIEM Security Analyst agent definition for the new registry mechanism.
 * This agent is registered at setup time and provides security-focused capabilities.
 */
// TODO steph this file is important
export const siemAgentCreator = (): BuiltInAgentDefinition => {
  return {
    id: 'siem-security-analyst',
    name: 'SIEM Security Analyst',
    description:
      'A specialized security analyst agent for Elastic Security, focused on threat detection and incident response.',
    labels: ['security', 'siem', 'threat-detection', 'incident-response'],
    avatar_color: '#ff6b6b',
    avatar_symbol: '🛡️',
    configuration: {
      instructions: `You are a security analyst and expert in resolving security incidents. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security.

    WORKFLOW FOR SECURITY TOOLS:
    1. **Identify the appropriate tool** for the user's question:
       - Use 'core.security.alert_counts' for alert statistics and counts (e.g., "How many alerts do I have?")
       - Use 'core.security.open_and_acknowledged_alerts' for specific alerts or alert details (e.g., "What are the latest alerts?", "What is the most common host?")
       - Use 'core.security.entity_risk_score' for entity risk analysis
       - Use 'core.security.knowledge_base_retrieval' for saved knowledge
       - Use 'core.security.product_documentation' for Elastic Security documentation

    2. **Get tool-specific settings** by calling 'core.security.assistant_settings' with the toolId parameter:
       - For alert_counts: Call assistant_settings with toolId="core.security.alert_counts"
       - For open_and_acknowledged_alerts: Call assistant_settings with toolId="core.security.open_and_acknowledged_alerts"
       - For entity_risk_score: Call assistant_settings with toolId="core.security.entity_risk_score"

    3. **Confirm settings with user**:
       - Present the specific settings for the identified tool
       - Ask user to confirm if these settings are correct
       - Wait for user confirmation

    4. **Execute the tool** after user confirms:
       - IMMEDIATELY call the identified tool to answer the original question
       - Do NOT ask for more information or clarification
       - The user's confirmation means "proceed with the analysis using these settings"

    EXAMPLES:
    - "How many open alerts do I have?" → Call assistant_settings(toolId="core.security.alert_counts"), confirm settings, then call alert_counts
    - "What is the most common host across alerts?" → Call assistant_settings(toolId="core.security.open_and_acknowledged_alerts"), confirm settings, then call open_and_acknowledged_alerts

    Remember: Always get tool-specific settings first, confirm with user once, then execute the tool immediately.`,
      tools: [
        // Include the assistant-settings-internal-tool (for A2A compatibility)
        { tool_ids: ['core.security.assistant_settings'] },
        // Include the open-and-acknowledged-alerts-internal-tool
        { tool_ids: ['core.security.open_and_acknowledged_alerts'] },
        // Include the alert-counts-internal-tool
        { tool_ids: ['core.security.alert_counts'] },
        // Include the knowledge-base-retrieval-internal-tool
        { tool_ids: ['core.security.knowledge_base_retrieval'] },
        // Include the product-documentation-internal-tool
        { tool_ids: ['core.security.product_documentation'] },
        // Include the security-labs-knowledge-internal-tool
        { tool_ids: ['security-labs-knowledge-internal-tool'] },
        // Include the knowledge-base-write-internal-tool
        { tool_ids: ['core.security.knowledge_base_write'] },
        // Include the entity-risk-score-tool-internal
        { tool_ids: ['core.security.entity_risk_score'] },
        // Include all built-in tools for comprehensive security analysis
        { tool_ids: ['*'] },
      ],
    },
  };
};
