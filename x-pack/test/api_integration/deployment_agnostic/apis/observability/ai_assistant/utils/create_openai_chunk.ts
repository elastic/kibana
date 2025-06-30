/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type OpenAI from 'openai';
import { ToolMessage } from './create_llm_proxy';

export function createOpenAiChunk(msg: string | ToolMessage): OpenAI.ChatCompletionChunk {
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
