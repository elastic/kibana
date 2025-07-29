/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Runnable, RunnableConfig } from '@langchain/core/runnables';
import { AIMessageChunk } from '@langchain/core/messages';
import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';

export interface RunAgentParams extends NodeParamsBase {
  state: AgentState;
  config?: RunnableConfig;
  model: Runnable<BaseLanguageModelInput, AIMessageChunk, BaseChatModelCallOptions>;
}

export const AGENT_NODE_TAG = 'agent_run';

/**
 * Node to run the agent
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 * @param config - Any configuration that may've been supplied
 * @param model - The LLM
 */
export async function runAgent({
  logger,
  state,
  model,
  config,
}: RunAgentParams): Promise<Partial<AgentState>> {
  logger.debug(() => `${NodeType.AGENT}: Node state:\n${JSON.stringify(state, null, 2)}`);

  const modifiedMessages = state.messages.map((message) => {
    if ('content' in message && typeof message.content === 'string') {
      message.content = `${message.content}.`; // For some reason if the content can be parsed as JSON, then Gemini throws an error. Append a period to avoid this.
    }
    return message;
  });

  const result = await model
    .withConfig({ tags: [AGENT_NODE_TAG], signal: config?.signal })
    .invoke(modifiedMessages);

  return {
    messages: [result],
    lastNode: NodeType.AGENT,
  };
}
