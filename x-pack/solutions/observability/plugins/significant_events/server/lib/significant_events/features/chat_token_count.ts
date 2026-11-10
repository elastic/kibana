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

/**
 * The tokens every round of a conversation spent. A step retried on the same conversation adds a
 * round per attempt, and a round that never finalized still spent what it records.
 */
export function chatTokenCountFromRounds(
  rounds: ReadonlyArray<{ model_usage?: ModelTokenUsage }>
): ChatCompletionTokenCount {
  return rounds
    .map(({ model_usage: usage }) => chatTokenCountFromModelUsage(usage))
    .reduce<ChatCompletionTokenCount>(
      (sum, tokens) =>
        tokens
          ? {
              prompt: sum.prompt + tokens.prompt,
              completion: sum.completion + tokens.completion,
              total: sum.total + tokens.total,
              cached: (sum.cached ?? 0) + (tokens.cached ?? 0),
            }
          : sum,
      { prompt: 0, completion: 0, total: 0, cached: 0 }
    );
}
