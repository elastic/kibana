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
import { userMessage, assistantMessage } from '../../../../common/utils/messages';

export const messageFromLangchain = (message: BaseMessage) => {
  if (isAIMessage(message)) {
    return assistantMessage(extractTextContent(message));
  }
  if (isHumanMessage(message)) {
    return userMessage(extractTextContent(message));
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
