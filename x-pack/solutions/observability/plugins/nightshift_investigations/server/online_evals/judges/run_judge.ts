/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, Prompt, ToolChoice } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import pRetry from 'p-retry';

/** Matches the evals plugin's shipped judges. */
const JUDGE_RETRIES = 3;

/** Explanations are capped at the length the online eval score event keeps. */
export const MAX_EXPLANATION_LENGTH = 500;

export const capExplanation = (text: string): string =>
  text.length > MAX_EXPLANATION_LENGTH ? `${text.slice(0, MAX_EXPLANATION_LENGTH - 1)}…` : text;

/** Scales a 0-3 grade to 0-1, rounded to three decimals. */
export const gradeToScore = (grade: number): number => Math.round((grade / 3) * 1000) / 1000;

export const gradeSchema = lazySchema(() => z.number().int().min(0).max(3));

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
  pRetry(
    async () => {
      const response = await inferenceClient.prompt({
        prompt,
        input,
        stream: false,
        toolChoice: { function: toolName } as ToolChoice,
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
    },
    { retries: JUDGE_RETRIES }
  );
