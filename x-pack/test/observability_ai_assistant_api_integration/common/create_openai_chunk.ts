/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateChatCompletionResponseChunk } from '@kbn/observability-ai-assistant-plugin/server/service/client/adapters/process_openai_stream';
import { v4 } from 'uuid';

export function createOpenAiChunk(
  msg: string | { content?: string; function_call?: { name: string; arguments?: string } }
): CreateChatCompletionResponseChunk {
  msg = typeof msg === 'string' ? { content: msg } : msg;

  return {
    id: v4(),
    object: 'chat.completion.chunk',
    created: 0,
    model: 'gpt-4',
    choices: [
      {
        delta: msg,
        index: 0,
        finish_reason: null,
      },
    ],
  };
}
