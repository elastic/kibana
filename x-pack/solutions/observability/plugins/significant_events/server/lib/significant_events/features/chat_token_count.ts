/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';

interface ModelTokenUsage {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens?: number;
}

export function chatTokenCountFromModelUsage(
  usage: ModelTokenUsage | undefined
): ChatCompletionTokenCount | undefined {
  if (!usage) {
    return undefined;
  }
  return {
    prompt: usage.input_tokens,
    completion: usage.output_tokens,
    total: usage.input_tokens + usage.output_tokens,
    cached: usage.cached_input_tokens,
  };
}
