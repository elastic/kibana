/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMap, OperatorFunction, of, EMPTY } from 'rxjs';
import { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import { AgentRunEvents } from '../types';
import { extractTextContent, messageFromLangchain } from './from_langchain_messages';

function filterMap<T, R>(project: (value: T) => R | undefined | null): OperatorFunction<T, R> {
  return mergeMap((value: T) => {
    const result = project(value);
    return result != null ? of(result) : EMPTY;
  });
}

export const langchainToChatEvents = ({
  runName,
}: {
  runName: string;
}): OperatorFunction<LangchainStreamEvent, AgentRunEvents> => {
  return (langchain$) => {
    return langchain$.pipe(
      filterMap<LangchainStreamEvent, AgentRunEvents>((event) => {
        if (event.event === 'on_chat_model_stream') {
          const chunk: AIMessageChunk = event.data.chunk;
          const content = extractTextContent(chunk);
          return { type: 'message_chunk', text_chunk: content };
        }

        if (event.event === 'on_chain_end' && event.name === runName) {
          const output = event.data.output;
          const addedMessages = output.addedMessages as BaseMessage[];
          const lastMessage = addedMessages[addedMessages.length - 1];
          return { type: 'message', message: messageFromLangchain(lastMessage) };
        }

        return undefined;
      })
    );
  };
};
