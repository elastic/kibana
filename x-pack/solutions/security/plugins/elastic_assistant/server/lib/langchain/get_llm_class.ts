/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientChatOpenAI,
  ActionsClientChatBedrockConverse,
  ActionsClientChatVertexAI,
} from '@kbn/langchain/server';

export const getLlmClass = (llmType?: string) => {
  switch (llmType) {
    case 'bedrock':
      return ActionsClientChatBedrockConverse;
    case 'gemini':
      return ActionsClientChatVertexAI;
    case 'openai':
    default:
      return ActionsClientChatOpenAI;
  }
};
