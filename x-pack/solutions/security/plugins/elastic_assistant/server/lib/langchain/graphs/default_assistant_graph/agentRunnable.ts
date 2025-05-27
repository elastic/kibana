/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDefinition } from '@langchain/core/language_models/base';
import {
  ActionsClientChatBedrockConverse,
  ActionsClientChatVertexAI,
  ActionsClientChatOpenAI,
} from '@kbn/langchain/server';
import type { StructuredToolInterface } from '@langchain/core/tools';
import {
  AgentRunnableSequence,
  createOpenAIToolsAgent,
  createToolCallingAgent,
} from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const TOOL_CALLING_LLM_TYPES = new Set(['bedrock', 'gemini']);

export const agentRunnableFactory = async ({
  llm,
  isOpenAI,
  llmType,
  tools,
  isStream,
  prompt,
}: {
  llm: ActionsClientChatBedrockConverse | ActionsClientChatVertexAI | ActionsClientChatOpenAI;
  isOpenAI: boolean;
  llmType: string | undefined;
  tools: StructuredToolInterface[] | ToolDefinition[];
  isStream: boolean;
  prompt: ChatPromptTemplate;
}): Promise<AgentRunnableSequence> => {
  const params = {
    llm,
    tools,
    streamRunnable: isStream,
    prompt,
  } as const;

  if (isOpenAI || llmType === 'inference') {
    return createOpenAIToolsAgent(params);
  }

  return createToolCallingAgent(params);
};
