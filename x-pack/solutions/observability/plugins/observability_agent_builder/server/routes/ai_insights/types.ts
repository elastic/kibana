/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { concat, of } from 'rxjs';
import type { ChatCompletionEvent } from '@kbn/inference-common';

export interface ContextEvent {
  type: 'context';
  context: string;
  [key: string]: unknown;
}

export interface AiInsightResult {
  events$: Observable<ChatCompletionEvent | ContextEvent>;
  context: string;
}

/**
 * Creates an AiInsightResult by prepending a context event to the chat completion stream.
 */
export function createAiInsightResult(
  context: string,
  events$: Observable<ChatCompletionEvent>
): AiInsightResult {
  return {
    events$: concat(of<ContextEvent>({ type: 'context', context }), events$),
    context,
  };
}
