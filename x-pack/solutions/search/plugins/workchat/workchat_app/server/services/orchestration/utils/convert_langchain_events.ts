/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMap, OperatorFunction, of } from 'rxjs';
import { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { ToolCallEvent } from '../../../../common/chat_events';
import { AgentRunEvents } from '../types';
import { extractTextContent, messageFromLangchain } from './from_langchain_messages';

function filterMap<T, R>(project: (value: T) => R[]): OperatorFunction<T, R> {
  return mergeMap((value: T) => {
    const result = project(value);
    return of(...result);
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
        // TODO: remove
        // console.log(JSON.stringify(event, undefined, 2));

        // stream text chunks for the UI
        if (event.event === 'on_chat_model_stream') {
          const chunk: AIMessageChunk = event.data.chunk;
          const content = extractTextContent(chunk);
          if (content) {
            return [{ type: 'message_chunk', text_chunk: content }];
          }
        }

        // we need to listen the tool chain to get tool ids..
        if (event.event === 'on_chain_start' && event.name === 'tools') {
          const addedMessages = event.data.input.addedMessages;
          const lastMessage = addedMessages[addedMessages.length - 1];
          const toolCalls = lastMessage.tool_calls as ToolCall[];

          return toolCalls.map<ToolCallEvent>((toolCall, index) => {
            return {
              type: 'tool_call',
              toolCall: {
                toolName: toolCall.name,
                callId: toolCall.id ?? `${lastMessage.id}_tool_call_${index}`,
                args: toolCall.args,
              },
            };
          });
        }

        if (event.event === 'on_tool_end' && event.metadata?.langgraph_node === 'tools') {
          return [
            {
              type: 'tool_result',
              toolResult: {
                callId: event.data.output.tool_call_id,
                result: event.data.output.content,
              },
            },
          ];
        }

        // stream messages
        // TODO: send all new messages
        if (event.event === 'on_chain_end' && event.name === runName) {
          const output = event.data.output;
          const addedMessages = output.addedMessages as BaseMessage[];
          const lastMessage = addedMessages[addedMessages.length - 1];
          return [{ type: 'message', message: messageFromLangchain(lastMessage) }];
        }

        return [];
      })
    );
  };
};
