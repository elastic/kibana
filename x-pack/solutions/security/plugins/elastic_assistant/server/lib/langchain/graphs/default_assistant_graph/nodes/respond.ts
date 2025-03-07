/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StringWithAutocomplete } from '@langchain/core/dist/utils/types';
import { RunnableConfig } from '@langchain/core/runnables';
import { AGENT_NODE_TAG } from './run_agent';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';

export interface RespondParams extends NodeParamsBase {
  state: AgentState;
  model: BaseChatModel;
  config?: RunnableConfig;
}

export async function respond({
  config,
  logger,
  state,
  model,
}: RespondParams): Promise<Partial<AgentState>> {
  logger.debug(() => `${NodeType.RESPOND}: Node state:\n${JSON.stringify(state, null, 2)}`);

  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (lastMessage && 'content' in lastMessage) {
    const userMessage = [
      'user',
      `Respond exactly with
    ${lastMessage.content}

    Do not verify, confirm or anything else. Just reply with the same content as provided above.`,
    ] as [StringWithAutocomplete<'user'>, string];

    const responseMessage = await model
      // use AGENT_NODE_TAG to identify as agent node for stream parsing
      .withConfig({ runName: 'Summarizer', tags: [AGENT_NODE_TAG], signal: config?.signal })
      .invoke([userMessage]);

    return {
      messages: [responseMessage],
      lastNode: NodeType.RESPOND,
    };
  }
  return { lastNode: NodeType.RESPOND };
}
