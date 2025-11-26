/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { ENTITY_ANALYTICS_TOOL_INTERNAL_ID } from '../../../assistant/tools/entity_analytics/entity_analytics';

const DEFAULT_SYSTEM_PROMPT = `You are a security analyst and expert in entity analytics. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security.`;

const RESPONSE_FORMATTING_GUIDELINES = `
* Always provide your answer in markdown format.
* When providing code blocks, always use triple backticks (\`\`\`) before and after the code block.
* Always specify the language for syntax highlighting right after the opening triple backticks. For ES|QL use \`\`\`esql.
* Always provide explanations and context outside of code blocks.
* When referencing fields, indices, or job IDs, always format them using backticks (\`field_name\`, \`index_name\`, \`job_id\`).
* When some engine, solution or job is not installed, please inform the user that they need to enable it so you can answer related questions.
`;

const RESEARCH_PROMPT = `
* Always call the '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}' first to get information about the security solution, entity analytics indices, and data.
If the response from the '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}' for a domain doesn't contain the right information or the engine is disabled, you must call '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}' for another domains until you are sure it can't answer the question.
* After calling the '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}', if it returns a query, you must call the 'execute_esql' tool to generate an ES|QL.
**Do not generate event/logs query if there is a domain index or anomaly job that could answer the question**
`;

/**
 * Creates the SIEM Security Analyst agent definition for the new registry mechanism.
 * This agent is registered at setup time and provides security-focused capabilities.
 */
export const entityAnalyticsAgentCreator = (): BuiltInAgentDefinition => {
  return {
    id: 'security.entity_analytics.agent',
    name: 'Entity Analytics Agent',
    description: DEFAULT_SYSTEM_PROMPT,
    labels: ['security', 'entity-analytics'],
    avatar_color: '#ff6b6b',
    avatar_symbol: '🛡️',
    configuration: {
      instructions: DEFAULT_SYSTEM_PROMPT,
      research: {
        instructions: RESEARCH_PROMPT,
      },
      answer: {
        instructions: RESPONSE_FORMATTING_GUIDELINES,
      },
      tools: [
        { tool_ids: [ENTITY_ANALYTICS_TOOL_INTERNAL_ID] },

        { tool_ids: ['platform.core.execute_esql'] },
        { tool_ids: ['platform.core.generate_esql'] },
        { tool_ids: ['platform.core.get_index_mapping'] },
        { tool_ids: ['platform.core.list_indices'] },
      ],
    },
  };
};
