/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundInferenceClient,
  ChatCompletionTokenCount,
  Message,
  ToolCallArguments,
} from '@kbn/inference-common';
import { isToolValidationError } from '@kbn/inference-common';
import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import {
  BRIEF_TEXT_LIMITS,
  AREA_IDS,
  briefSchema,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import { BRIEF_LIMITS } from '../../../../../common/entity_analytics/executive_brief/constants';
import { getSubmitBriefTool, SUBMIT_BRIEF_TOOL_NAME } from './brief_tool_schema';

/** The model's tool call, kept so a repair can reply to it. */
export interface SubmittedToolCall {
  toolCallId: string;
  arguments: ToolCallArguments;
}

interface AttemptBase {
  toolCall?: SubmittedToolCall;
  /** Missing when the provider did not report usage (or the call failed validation upstream). */
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
}

const MAX_REPORTED_ERRORS = 20;
const MAX_EVIDENCE_IDS = 24;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cap = (value: unknown, max: number): unknown =>
  Array.isArray(value) ? value.slice(0, max) : value;

const mapItems = (value: unknown, max: number, map: (item: JsonRecord) => JsonRecord): unknown =>
  Array.isArray(value)
    ? value.slice(0, max).map((item) => (isRecord(item) ? map(item) : item))
    : value;

/** Trims over-long prose at a word boundary, so a long headline doesn't cost a repair round-trip. */
const clampText = (value: unknown, max: number): unknown => {
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

const withoutNull = (record: JsonRecord, key: string): JsonRecord =>
  record[key] === null
    ? Object.fromEntries(Object.entries(record).filter(([name]) => name !== key))
    : record;

/**
 * Fixes harmless overshoots before validation: lists longer than allowed are cut (the model
 * ranks them, so the tail goes) and a null optional threat reference is removed.
 */
export const normalizeBriefOutput = (output: unknown): unknown => {
  if (!isRecord(output)) {
    return output;
  }
  const evidence = (item: JsonRecord): JsonRecord => ({
    ...item,
    evidence: cap(item.evidence, MAX_EVIDENCE_IDS),
  });
  return {
    ...output,
    verdict: isRecord(output.verdict)
      ? clampFields(evidence(output.verdict), {
          headline: BRIEF_TEXT_LIMITS.verdictHeadline,
          summary: BRIEF_TEXT_LIMITS.verdictSummary,
        })
      : output.verdict,
    areas: mapItems(output.areas, AREA_IDS.length, (area) =>
      clampFields(evidence(area), { summary: BRIEF_TEXT_LIMITS.areaSummary })
    ),
    threats: mapItems(output.threats, BRIEF_LIMITS.maxThreats, (threat) => ({
      ...clampFields(evidence(threat), {
        title: BRIEF_TEXT_LIMITS.threatTitle,
        narrative: BRIEF_TEXT_LIMITS.narrative,
        whyItMatters: BRIEF_TEXT_LIMITS.whyItMatters,
      }),
      entities: cap(threat.entities, BRIEF_LIMITS.maxEntitiesPerThreat),
      keyEvents: cap(threat.keyEvents, BRIEF_LIMITS.maxKeyEventsPerThreat),
      nextStep: isRecord(threat.nextStep)
        ? clampFields(threat.nextStep, { action: BRIEF_TEXT_LIMITS.nextStepAction })
        : threat.nextStep,
    })),
    actions: mapItems(output.actions, BRIEF_LIMITS.maxActions, (action) => ({
      ...clampFields(withoutNull(evidence(action), 'threat'), {
        action: BRIEF_TEXT_LIMITS.actionText,
        rationale: BRIEF_TEXT_LIMITS.rationale,
      }),
      targets: cap(action.targets, BRIEF_LIMITS.maxEntitiesPerThreat),
    })),
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

type ParseResult = { ok: true; brief: Brief } | { ok: false; errors: string[] };

/** Validates the tool arguments against the contract schema. */
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

/**
 * One `chatComplete` call with the forced `submit_brief` tool. Returns the validated brief, or the
 * schema errors to send back in a repair. A tool-validation error raised by the inference plugin
 * is handled the same way (after a local normalisation that may rescue it). Other inference errors
 * are thrown to the caller.
 */
export const composeBrief = async ({
  inferenceClient,
  system,
  messages,
  abortSignal,
}: ComposeBriefParams): Promise<ComposeAttempt> => {
  try {
    const response = await inferenceClient.chatComplete({
      system,
      messages,
      tools: { [SUBMIT_BRIEF_TOOL_NAME]: getSubmitBriefTool() },
      toolChoice: { function: SUBMIT_BRIEF_TOOL_NAME },
      abortSignal,
    });
    const { tokens, model } = response;
    const call = response.toolCalls.find(({ function: fn }) => fn.name === SUBMIT_BRIEF_TOOL_NAME);
    if (!call) {
      return {
        ok: false,
        errors: [`No ${SUBMIT_BRIEF_TOOL_NAME} tool call was made; call it with the full brief.`],
        tokens,
        model,
      };
    }
    const toolCall = {
      toolCallId: call.toolCallId,
      arguments: toArguments(call.function.arguments),
    };
    const parsed = parseBrief(call.function.arguments);
    return parsed.ok
      ? { ok: true, brief: parsed.brief, toolCall, tokens, model }
      : { ok: false, errors: parsed.errors, toolCall, tokens, model };
  } catch (error) {
    if (!(error instanceof Error) || !isToolValidationError(error)) {
      throw error;
    }
    const [failedCall] = error.meta.toolCalls ?? [];
    const raw = parseJson(error.meta.arguments ?? failedCall?.function.arguments);
    const toolCall = failedCall
      ? { toolCallId: failedCall.toolCallId, arguments: toArguments(raw) }
      : undefined;
    const parsed = parseBrief(raw);
    if (parsed.ok && toolCall) {
      return { ok: true, brief: parsed.brief, toolCall };
    }
    const errors = parsed.ok ? [] : parsed.errors;
    return {
      ok: false,
      errors: errors.length > 0 ? errors : [error.meta.errorsText ?? error.message],
      toolCall,
    };
  }
};
