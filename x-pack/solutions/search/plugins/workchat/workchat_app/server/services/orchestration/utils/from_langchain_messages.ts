/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BaseMessage,
  MessageContentComplex,
  isAIMessage,
  isHumanMessage,
} from '@langchain/core/messages';
import { createUserMessage, createAssistantMessage } from '../../../../common/conversation_events';

export const messageFromLangchain = (message: BaseMessage) => {
  if (isAIMessage(message)) {
    return createAssistantMessage({ content: extractTextContent(message) });
  }
  if (isHumanMessage(message)) {
    return createUserMessage({ content: extractTextContent(message) });
  }

  // tools will come later
  throw new Error(`Unsupported message type ${message}`);
};

export const extractTextContent = (message: BaseMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  } else {
    let content = '';
    for (const item of message.content as MessageContentComplex[]) {
      if (item.type === 'text') {
        content += item.text;
      }
    }
    return content;
  }
};
