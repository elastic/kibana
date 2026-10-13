/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  BoundInferenceClient,
  ChatCompletionTokenCount,
  Message,
  ToolCallArguments,
} from '@kbn/inference-common';
import {
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
  isInferenceProviderError,
  isInferenceRequestAbortedError,
  isToolValidationError,
} from '@kbn/inference-common';
import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import {
  AREA_IDS,
  BRIEF_TEXT_LIMITS,
  MAX_CITED_IDS,
  rawTextLimit,
  briefSchema,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import { getSubmitBriefTool, SUBMIT_BRIEF_TOOL_NAME } from './brief_tool_schema';

/** The model's tool call, kept so a repair can reply to it. */
export interface SubmittedToolCall {
  toolCallId: string;
  arguments: ToolCallArguments;
}

interface AttemptBase {
  toolCall?: SubmittedToolCall;
  /** Missing when the inference plugin reported no usage for the call. */
  tokens?: ChatCompletionTokenCount;
  model?: string;
}

export type ComposeAttempt =
  | (AttemptBase & { ok: true; brief: Brief; toolCall: SubmittedToolCall })
  | (AttemptBase & { ok: false; errors: string[] });

export interface ComposeBriefParams {
  inferenceClient: BoundInferenceClient;
  system: string;
  messages: Message[];
  abortSignal: AbortSignal;
  logger: Logger;
}

const MAX_REPORTED_ERRORS = 20;

/** Provider statuses the inference plugin doesn't retry by default. */
const NON_RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  400, 401, 402, 403, 404, 405, 406, 407, 409,
]);

/**
 * The inference plugin's default retry policy, minus tool validation errors: those go through the
 * repair round-trip, which tells the model what to fix. A blind retry would repeat the same call
 * and drop the failed attempt's token usage.
 */
const shouldRetry = (error: Error): boolean => {
  if (isInferenceProviderError(error)) {
    const { status } = error;
    return status === undefined || !NON_RETRYABLE_STATUSES.has(status);
  }
  return isInferenceRequestAbortedError(error);
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Unique integer ids, capped; anything that isn't a list is left for validation to report. */
const normalizeIds = (value: unknown): unknown =>
  Array.isArray(value)
    ? [...new Set(value.filter((id) => Number.isInteger(id)))].slice(0, MAX_CITED_IDS)
    : value;

/**
 * Trims prose beyond the raw bound at a word boundary, so it doesn't cost a repair round-trip.
 * Verification then trims to the visible limit, counting mentions as names.
 */
const clampText = (value: unknown, visibleLimit: number): unknown => {
  const max = rawTextLimit(visibleLimit);
  if (typeof value !== 'string' || value.length <= max) {
    return value;
  }
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
};

const clampFields = (record: JsonRecord, limits: Record<string, number>): JsonRecord =>
  Object.entries(limits).reduce<JsonRecord>(
    (acc, [key, max]) => (key in acc ? { ...acc, [key]: clampText(acc[key], max) } : acc),
    record
  );

const withNormalizedIds = (record: JsonRecord): JsonRecord => ({
  ...record,
  factIds: normalizeIds(record.factIds),
  linkIds: normalizeIds(record.linkIds),
});

/** Keeps the first area of each id, then caps the list. */
const normalizeAreas = (areas: unknown): unknown => {
  if (!Array.isArray(areas)) {
    return areas;
  }
  const seen = new Set<unknown>();
  return areas
    .filter((area) => {
      if (!isRecord(area) || seen.has(area.id)) {
        return !isRecord(area);
      }
      seen.add(area.id);
      return true;
    })
    .slice(0, AREA_IDS.length)
    .map((area) =>
      isRecord(area)
        ? clampFields(withNormalizedIds(area), { summary: BRIEF_TEXT_LIMITS.areaSummary })
        : area
    );
};

/**
 * Fixes mechanical overshoots before validation, so they don't cost a repair: prose longer than
 * allowed is trimmed, cited ids are deduplicated and cut (non-integers dropped), and repeated
 * areas are removed.
 */
export const normalizeBriefOutput = (output: unknown): unknown => {
  if (!isRecord(output)) {
    return output;
  }
  return {
    ...output,
    verdict: isRecord(output.verdict)
      ? clampFields(withNormalizedIds(output.verdict), {
          headline: BRIEF_TEXT_LIMITS.verdictHeadline,
          summary: BRIEF_TEXT_LIMITS.verdictSummary,
        })
      : output.verdict,
    areas: normalizeAreas(output.areas),
  };
};

type ParseResult = { ok: true; brief: Brief } | { ok: false; errors: string[] };

/** Validates the tool arguments against the contract schema, after normalisation. */
export const parseBrief = (output: unknown): ParseResult => {
  const result = briefSchema.safeParse(normalizeBriefOutput(output));
  if (result.success) {
    return { ok: true, brief: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues
      .slice(0, MAX_REPORTED_ERRORS)
      .map(({ path, message }) => `${path.length > 0 ? path.join('.') : '(root)'}: ${message}`),
  };
};

const parseJson = (raw: string | undefined): unknown => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const toArguments = (value: unknown): ToolCallArguments => (isRecord(value) ? value : {});

interface RawToolCall {
  toolCallId: string;
  arguments: unknown;
}

/** Builds the attempt from tool arguments, whether validated by the plugin or recovered from its error. */
const toAttempt = (call: RawToolCall | undefined, fallbackErrors: string[]): ComposeAttempt => {
  if (!call) {
    return { ok: false, errors: fallbackErrors };
  }
  const toolCall = { toolCallId: call.toolCallId, arguments: toArguments(call.arguments) };
  const parsed = parseBrief(call.arguments);
  if (parsed.ok) {
    return { ok: true, brief: parsed.brief, toolCall };
  }
  return { ok: false, errors: parsed.errors.length > 0 ? parsed.errors : fallbackErrors, toolCall };
};

/**
 * One `chatComplete` call with the forced `submit_brief` tool. Returns the validated brief, or the
 * problems to send back in a repair. A tool validation error raised by the inference plugin is
 * handled the same way, after the local normalisation, which may rescue it. Other inference errors
 * are thrown to the caller.
 *
 * The call is streamed and its events collected here, rather than awaited as a single response,
 * so the token usage is kept even when the plugin rejects the tool call: the non-streaming
 * response is a rejected promise in that case, and its usage is lost.
 */
export const composeBrief = async ({
  inferenceClient,
  system,
  messages,
  abortSignal,
  logger,
}: ComposeBriefParams): Promise<ComposeAttempt> => {
  const usage: Pick<AttemptBase, 'tokens' | 'model'> = {};
  const withUsage = (attempt: ComposeAttempt): ComposeAttempt => {
    const missing: string[] = [];
    if (!usage.tokens) {
      missing.push('token usage');
    }
    if (!usage.model) {
      missing.push('model');
    }
    if (missing.length > 0) {
      logger.debug(
        `Executive brief: the inference plugin reported no ${missing.join(
          ' or '
        )} for the compose call`
      );
    }
    return { ...attempt, ...usage };
  };

  try {
    let submitted: RawToolCall | undefined;
    await inferenceClient
      .chatComplete({
        system,
        messages,
        tools: { [SUBMIT_BRIEF_TOOL_NAME]: getSubmitBriefTool() },
        toolChoice: { function: SUBMIT_BRIEF_TOOL_NAME },
        abortSignal,
        stream: true,
        retryConfiguration: { retryOn: shouldRetry },
      })
      .forEach((event) => {
        if (isChatCompletionTokenCountEvent(event)) {
          usage.tokens = event.tokens;
          usage.model = event.model ?? usage.model;
        } else if (isChatCompletionMessageEvent(event)) {
          const call = event.toolCalls.find(
            ({ function: fn }) => fn.name === SUBMIT_BRIEF_TOOL_NAME
          );
          submitted = call && { toolCallId: call.toolCallId, arguments: call.function.arguments };
        }
      });
    return withUsage(
      toAttempt(submitted, [
        `No ${SUBMIT_BRIEF_TOOL_NAME} tool call was made; call it with the full brief.`,
      ])
    );
  } catch (error) {
    if (!(error instanceof Error) || !isToolValidationError(error)) {
      throw error;
    }
    const failedCall = error.meta.toolCalls?.find(
      ({ function: fn }) => fn.name === SUBMIT_BRIEF_TOOL_NAME
    );
    const recovered = failedCall
      ? {
          toolCallId: failedCall.toolCallId,
          arguments: parseJson(error.meta.arguments ?? failedCall.function.arguments),
        }
      : undefined;
    return withUsage(toAttempt(recovered, [error.meta.errorsText ?? error.message]));
  }
};
