/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';

export const langChainMessages: BaseMessage[] = [
  new HumanMessage('What is my name?'),
  new AIMessage(
    "I'm sorry, but I am not able to answer questions unrelated to Elastic Security. If you have any questions about Elastic Security, please feel free to ask."
  ),
  new HumanMessage('\n\nMy name is Andrew'),
  new AIMessage(
    "Hello Andrew! If you have any questions about Elastic Security, feel free to ask, and I'll do my best to help you."
  ),
  new HumanMessage('\n\nDo you know my name?'),
];
