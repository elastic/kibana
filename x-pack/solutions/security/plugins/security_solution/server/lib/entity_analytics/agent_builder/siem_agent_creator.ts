/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

const DEFAULT_SYSTEM_PROMPT = `You are a security analyst and expert in entity analytics. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security.`;

const RESPONSE_FORMATTING_GUIDELINES = `
* Always provide your answer in markdown format.
* When providing code blocks, always use triple backticks (\`\`\`) before and after the code block.
* Always specify the language for syntax highlighting right after the opening triple backticks. For ES|QL use \`\`\`esql.
* Always provide explanations and context outside of code blocks.
* When referencing fields, indices, or job ids, always format them using backticks (\`field_name\`, \`index_name\`, \`job_id\`).
* When the users doesn't have a engine, solution or job installed, please inform them that they need to enable it so you can answer related questions.
`;

const RESEARCH_PROMPT = `
* Always call the 'entity-analytics-tool' first to get information about security solution and entity analytics indices and data.
* After calling the 'entity-analytics-tool', you must call the 'execute_esql' tool to generate a ES|QL query and answer the question if a query was provided.

**DOT NOT GENERATE EVENT/LOGS QUERY IF THERE IS A JOB OR DOMAIN INDEX THAT CAN BE USED TO ANSWER THE QUESTION**
`;

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
      instructions: DEFAULT_SYSTEM_PROMPT,
      research: {
        instructions: RESEARCH_PROMPT,
      },
      answer: {
        instructions: RESPONSE_FORMATTING_GUIDELINES,
      },
      tools: [
        { tool_ids: ['entity-analytics-tool'] },

        { tool_ids: ['platform.core.execute_esql'] },
        { tool_ids: ['platform.core.generate_esql'] },
        { tool_ids: ['platform.core.get_index_mapping'] },
        { tool_ids: ['platform.core.list_indices'] },
      ],
    },
  };
};
