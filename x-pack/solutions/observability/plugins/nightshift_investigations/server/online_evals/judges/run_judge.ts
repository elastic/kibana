/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundInferenceClient,
  ChatCompleteMetadata,
  Message,
  Prompt,
  ToolChoice,
  ToolSchema,
} from '@kbn/inference-common';
import {
  NIGHTSHIFT_ONLINE_EVALS_USAGE_ID,
  NIGHTSHIFT_USAGE_PARENT_ID,
  NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
} from '@kbn/nightshift-shared';
import { z, lazySchema } from '@kbn/zod/v4';
import pRetry from 'p-retry';
import { MAX_EXPLANATION_LENGTH } from '../build_score_event';

/** Matches the evals plugin's shipped judges. */
const JUDGE_RETRIES = 3;

/** Attributes judge calls to online evals in Nightshift's usage, apart from investigation spend. */
const JUDGE_METADATA: ChatCompleteMetadata = {
  connectorTelemetry: {
    pluginId: NIGHTSHIFT_ONLINE_EVALS_USAGE_ID,
    aggregateBy: NIGHTSHIFT_USAGE_PARENT_ID,
    productSolution: NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
    productFeature: NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  },
};

export { MAX_EXPLANATION_LENGTH };

export const capExplanation = (text: string): string =>
  text.length > MAX_EXPLANATION_LENGTH ? `${text.slice(0, MAX_EXPLANATION_LENGTH - 1)}…` : text;

/** Scales a 0-3 grade to 0-1, rounded to three decimals. */
export const gradeToScore = (grade: number): number => Math.round((grade / 3) * 1000) / 1000;

export const gradeSchema = lazySchema(() => z.number().int().min(0).max(3));

const retryOptions = {
  retries: JUDGE_RETRIES,
  onFailedAttempt: (error: Error) => {
    if (!error.message.startsWith('Invalid judge output')) {
      throw error;
    }
  },
};

/**
 * Prompts the judge, forcing a call to `toolName`, and returns the tool arguments once they
 * match `outputSchema`. Output that doesn't match is retried like a failed call.
 */
export const runJudge = async <TOutput>({
  inferenceClient,
  prompt,
  input,
  toolName,
  outputSchema,
}: {
  inferenceClient: BoundInferenceClient;
  prompt: Prompt;
  input: Record<string, unknown>;
  toolName: string;
  outputSchema: z.ZodType<TOutput>;
}): Promise<TOutput> =>
  pRetry(async () => {
    const response = await inferenceClient.prompt({
      prompt,
      input,
      stream: false,
      toolChoice: { function: toolName } as ToolChoice,
      metadata: JUDGE_METADATA,
    });
    const output = response.toolCalls?.[0]?.function.arguments;
    if (!output) {
      throw new Error(`The judge did not call the "${toolName}" tool`);
    }
    const parsed = outputSchema.safeParse(output);
    if (!parsed.success) {
      throw new Error(`Invalid judge output: ${z.prettifyError(parsed.error)}`);
    }
    return parsed.data;
  }, retryOptions);

/**
 * Like `runJudge`, for a judge that reads a conversation: sends `system` and `messages` as they
 * are, so the last message can carry the scoring request, and forces a call to `tool`.
 */
export const runConversationJudge = async <TOutput>({
  inferenceClient,
  system,
  messages,
  tool,
  outputSchema,
}: {
  inferenceClient: BoundInferenceClient;
  system: string;
  messages: Message[];
  tool: { name: string; description: string; schema: ToolSchema };
  outputSchema: z.ZodType<TOutput>;
}): Promise<TOutput> =>
  pRetry(async () => {
    const response = await inferenceClient.chatComplete({
      system,
      messages,
      tools: { [tool.name]: { description: tool.description, schema: tool.schema } },
      toolChoice: { function: tool.name } as ToolChoice,
      stream: false,
      metadata: JUDGE_METADATA,
    });
    const output = response.toolCalls?.[0]?.function.arguments;
    if (!output) {
      throw new Error(`The judge did not call the "${tool.name}" tool`);
    }
    const parsed = outputSchema.safeParse(output);
    if (!parsed.success) {
      throw new Error(`Invalid judge output: ${z.prettifyError(parsed.error)}`);
    }
    return parsed.data;
  }, retryOptions);
