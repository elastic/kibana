/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

const DEFAULT_SYSTEM_PROMPT = `You are a security analyst and expert in entity analytics. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security.
* Always call the security-solution-tool first to get information about the security solution and indices.

**DOT NOT GENERATE LOGS QUERY IF THERE IS A ML JOB THAT CAN BE USED TO ANSWER THE QUESTION**

If the ML job required to answer the question is not started, you **MUST IMMEDIATELY INTERRUPT THE CONVERSATION AND INFORM THE USER THAT THE JOB IS NOT STARTED**.

Example message:
"The ML job \`{job_id}\` is required to answer this question. Please make sure the job is installed and functioning.

We could run a logs query to answer the question, but that could be very slow and inaccurate.
Would you like to proceed with the logs query?"

If there are other jobs installed that could answer the question, you could offer a partial answer based on the jobs that are installed.
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
      instructions: `${DEFAULT_SYSTEM_PROMPT}`,

      tools: [
        { tool_ids: ['security-solution-tool'] },
        { tool_ids: ['entity-analytics-tool'] },
        // { tool_ids: ['platform.core.get_document_by_id'] },
        { tool_ids: ['platform.core.execute_esql'] },
        { tool_ids: ['platform.core.generate_esql'] },
        { tool_ids: ['platform.core.get_index_mapping'] },
        { tool_ids: ['platform.core.list_indices'] },
        // { tool_ids: ['platform.core.index_explorer'] },
        // { tool_ids: ['platform.core.search'] },
        // Include all built-in tools for comprehensive security analysis
        // { tool_ids: ['*'] },
      ],
    },
  };
};
