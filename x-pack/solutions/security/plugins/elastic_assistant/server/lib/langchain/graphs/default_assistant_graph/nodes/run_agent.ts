/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runnable, RunnableConfig } from '@langchain/core/runnables';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';

export interface RunAgentParams extends Pick<NodeParamsBase, 'logger'> {
  state: Pick<AgentState, 'messages'>;
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
    if (
      'content' in message &&
      typeof message.content === 'string' &&
      (message.content[message.content.length - 1] === '}' ||
        message.content[message.content.length - 1] === ']')
    ) {
      /* The Gemini models throw an error if the content can be parsed as JSON.
      A hack to avoid this is to append a period to the end of the message. This map
      should be removed when the root cause of that issue is fixed.
      */
      const newContent = `${message.content}.`;
      message.content = newContent;
      message.lc_kwargs.content = newContent;
    }
    return message;
  });

  const result = await model
    .withConfig({ tags: [AGENT_NODE_TAG], ...config })
    .invoke(modifiedMessages);

  return {
    messages: [result],
    lastNode: NodeType.AGENT,
  };
}
