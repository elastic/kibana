/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMap, OperatorFunction, of, EMPTY } from 'rxjs';
import { MessageContentComplex } from '@langchain/core/messages';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import { ChatEvent } from '../../../../common/chat_events';

function filterMap<T, R>(project: (value: T) => R | undefined | null): OperatorFunction<T, R> {
  return mergeMap((value: T) => {
    const result = project(value);
    return result != null ? of(result) : EMPTY;
  });
}

export const langchainToChatEvents = (): OperatorFunction<LangchainStreamEvent, ChatEvent> => {
  return (langchain$) => {
    return langchain$.pipe(
      filterMap<LangchainStreamEvent, ChatEvent>((event) => {
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data.chunk;
          let content = '';

          if (typeof chunk.content === 'string') {
            content = chunk.content;
          } else {
            for (const item of chunk.content as MessageContentComplex[]) {
              if (item.type === 'text') {
                content += item.text;
              }
            }
          }

          return { type: 'message_chunk', text_chunk: content };
        }

        return undefined;
      })
    );
  };
};
