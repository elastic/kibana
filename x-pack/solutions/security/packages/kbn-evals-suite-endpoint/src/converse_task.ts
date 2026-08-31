/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';

export const converseQuestionToTaskOutput = async (
  agentBuilderClient: AgentBuilderClient,
  question: string
) => {
  const response = await agentBuilderClient.converse({
    agentId: agentBuilderDefaultAgentId,
    input: question,
  });

  return {
    messages: [{ message: question }, { message: response.message }],
    steps: response.steps,
    errors: [] as unknown[],
    traceId: response.traceId,
  };
};
