/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import { ENTITY_ANALYTICS_TOOL_INTERNAL_ID } from '@kbn/security-solution-plugin/server/agent_builder/tools/entity_analytics/entity_analytics';
import type SuperTest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';

const DEFAULT_SYSTEM_PROMPT = `You are a security analyst and expert in entity analytics. Your role is to assist by answering questions about Elastic Security. Do not answer questions unrelated to Elastic Security.

RESEARCH_PROMPT:
* Always call the '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}' first to get information about the security solution, entity analytics indices, and data.
If the response from the '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}' for a domain doesn't contain the right information or the engine is disabled, you must call '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}' for another domains until you are sure it can't answer the question.
* After calling the '${ENTITY_ANALYTICS_TOOL_INTERNAL_ID}', if it returns a query, you must call the 'execute_esql' tool to generate an ES|QL.
**Do not generate event/logs query if there is a domain index or anomaly job that could answer the question**

RESPONSE_FORMATTING_GUIDELINES
* Always provide your answer in markdown format.
* When providing code blocks, always use triple backticks (\`\`\`) before and after the code block.
* Always specify the language for syntax highlighting right after the opening triple backticks. For ES|QL use \`\`\`esql.
* Always provide explanations and context outside of code blocks.
* When referencing fields, indices, or job IDs, always format them using backticks (\`field_name\`, \`index_name\`, \`job_id\`).
* When some engine, solution or job is not installed, please inform the user that they need to enable it so you can answer related questions.
`;

const entityAnalyticsAgentCreator = (agentId: string): BuiltInAgentDefinition => {
  return {
    id: agentId,
    name: 'Test Entity Analytics Agent',
    description: DEFAULT_SYSTEM_PROMPT,
    avatar_color: '#ff6b6b',
    avatar_symbol: '🏁',
    labels: ['security', 'entity-analytics', 'test'],
    configuration: {
      instructions: DEFAULT_SYSTEM_PROMPT,
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

export const createEntityAnalyticsTestAgent = async ({
  agentId,
  supertest,
  log,
}: {
  agentId: string;
  supertest: SuperTest.Agent;
  log: ToolingLog;
}): Promise<{ agent: BuiltInAgentDefinition }> => {
  const agentPayload = entityAnalyticsAgentCreator(agentId);
  const response = await supertest
    .post('/api/agent_builder/agents')
    .set('kbn-xsrf', 'kibana')
    .expect(200)
    .send(agentPayload);

  log.info(`Created agent: ${agentId}`);

  return response.body;
};

export const deleteEntityAnalyticsTestAgent = async ({
  agentId,
  supertest,
  log,
}: {
  agentId: string;
  supertest: SuperTest.Agent;
  log: ToolingLog;
}): Promise<void> => {
  const response = await supertest
    .delete(`/api/agent_builder/agents/${agentId}`)
    .set('kbn-xsrf', 'kibana')
    .expect(200);
  log.info(`Deleted agent: ${agentId}`);
  return response.body;
};
