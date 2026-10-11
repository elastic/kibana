/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompletionTokenCount,
  Message,
  ToolCallArguments,
  ToolSchema,
} from '@kbn/inference-common';
import { MessageRole, isToolValidationError } from '@kbn/inference-common';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';
import { BRIEF_OUTPUT_SCHEMA, BRIEF_SYSTEM_PROMPT } from './brief_prompt';
import {
  STRUCTURED_OUTPUT_TOOL_DESCRIPTION,
  buildBriefInput,
  estimateBriefPrompt,
} from './brief_request';
import { parseBriefOutput } from './parse_brief_output';
import type { BriefGenerationInput, BriefGenerationResult, BriefGenerator } from './types';

export const EXECUTIVE_BRIEF_INFERENCE_ID = 'ea-executive-brief-poc';

/** Name of the single forced tool, as `inference.output()` calls it. */
const STRUCTURED_OUTPUT_TOOL = 'structuredOutput';

/** Retries on a tool-schema validation error, equivalent to `output({ retry: { onValidationError: 1 } })`. */
const MAX_VALIDATION_RETRIES = 1;

export interface BriefChatCompleteRequest {
  system: string;
  messages: Message[];
  tools: { structuredOutput: { description: string; schema: ToolSchema } };
  toolChoice: { function: 'structuredOutput' };
  abortSignal?: AbortSignal;
}

export interface BriefChatCompleteResponse {
  toolCalls?: Array<{ function: { name: string; arguments?: object } }>;
  tokens?: ChatCompletionTokenCount;
}

/** The slice of a connector-bound inference client the generator needs (`BoundInferenceClient`). */
export interface BriefChatCompleteClient {
  chatComplete: (request: BriefChatCompleteRequest) => Promise<BriefChatCompleteResponse>;
}

type Tokens = NonNullable<ExecutiveBriefJob['tokens']>;

const addOptional = (a: number | undefined, b: number | undefined): number | undefined =>
  a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);

/** Sums usage across attempts; a response without `tokens` contributes nothing (not zero). */
export const sumTokens = (
  total: Tokens | undefined,
  next: ChatCompletionTokenCount | undefined
): Tokens | undefined => {
  if (!next) return total;
  const summed = {
    prompt: (total?.prompt ?? 0) + next.prompt,
    completion: (total?.completion ?? 0) + next.completion,
    cached: addOptional(total?.cached, next.cached),
    total: addOptional(total?.total, next.total),
  };
  return {
    prompt: summed.prompt,
    completion: summed.completion,
    ...(summed.cached !== undefined ? { cached: summed.cached } : {}),
    ...(summed.total !== undefined ? { total: summed.total } : {}),
  };
};

const isArguments = (value: unknown): value is ToolCallArguments =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const safeParseArguments = (raw: string): ToolCallArguments => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isArguments(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Generates the brief with `chatComplete` and one forced structured-output tool, which is what
 * `inference.output()` does internally, but `chatComplete` also returns token usage. The payload
 * carries ENT ids only (plus names in `names` mode), the system prompt is the hard-coded PoC
 * prompt, and the result is shape-checked here and then citation/relation-validated by the job.
 */
export class InferenceBriefGenerator implements BriefGenerator {
  public readonly kind = 'inference' as const;

  /** `model` is the connector's display name, recorded on the job. */
  constructor(private readonly client: BriefChatCompleteClient, private readonly model?: string) {}

  public estimate({ snapshot, mode }: BriefGenerationInput): ExecutiveBriefJob['estimate'] {
    return estimateBriefPrompt(snapshot, mode);
  }

  public async generate({
    snapshot,
    mode,
    abortSignal,
  }: BriefGenerationInput): Promise<BriefGenerationResult> {
    return this.attempt({
      messages: [{ role: MessageRole.User, content: buildBriefInput(snapshot, mode) }],
      abortSignal,
      attempts: 1,
    });
  }

  private async attempt({
    messages,
    abortSignal,
    attempts,
    tokens,
  }: {
    messages: Message[];
    abortSignal?: AbortSignal;
    attempts: number;
    tokens?: Tokens;
  }): Promise<BriefGenerationResult> {
    let response: BriefChatCompleteResponse;
    try {
      response = await this.client.chatComplete({
        system: BRIEF_SYSTEM_PROMPT,
        messages,
        tools: {
          structuredOutput: {
            description: STRUCTURED_OUTPUT_TOOL_DESCRIPTION,
            schema: BRIEF_OUTPUT_SCHEMA,
          },
        },
        toolChoice: { function: STRUCTURED_OUTPUT_TOOL },
        abortSignal,
      });
    } catch (error) {
      if (!isToolValidationError(error) || attempts > MAX_VALIDATION_RETRIES) {
        throw error;
      }
      // The failed attempt's usage is not exposed on the error, so it cannot be summed.
      const { toolCalls = [] } = error.meta;
      return this.attempt({
        messages: [
          ...messages,
          {
            role: MessageRole.Assistant,
            content: '',
            toolCalls: toolCalls.map((toolCall) => ({
              ...toolCall,
              function: {
                ...toolCall.function,
                arguments: safeParseArguments(toolCall.function.arguments),
              },
            })),
          },
          ...toolCalls.map((toolCall) => ({
            name: toolCall.function.name,
            role: MessageRole.Tool as const,
            toolCallId: toolCall.toolCallId,
            response: { error: error.meta },
          })),
        ],
        abortSignal,
        attempts: attempts + 1,
        tokens,
      });
    }

    const totalTokens = sumTokens(tokens, response.tokens);
    const [toolCall] = response.toolCalls ?? [];
    return {
      brief: parseBriefOutput(toolCall?.function.arguments),
      model: this.model,
      ...(totalTokens ? { tokens: totalTokens } : {}),
      attempts,
    };
  }
}
