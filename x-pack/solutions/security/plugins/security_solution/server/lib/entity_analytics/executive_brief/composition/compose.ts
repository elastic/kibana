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
  ToolCall,
  ToolCallArguments,
} from '@kbn/inference-common';
import {
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
  isInferenceProviderError,
  isInferenceRequestAbortedError,
  isToolValidationError,
  MessageRole,
} from '@kbn/inference-common';
import type { VerificationSummary } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { Brief } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { Evidence, SignalOutcome } from '../signals/types';
import { withBriefSpan } from '../telemetry';
import type { VerifyBriefResult } from '../verification/verify_brief';
import { verifyBrief } from '../verification/verify_brief';
import { formatEvidence } from './format_evidence';
import {
  buildSystemPrompt,
  buildUserMessage,
  getSubmitBriefTool,
  REPAIR_INSTRUCTIONS,
  SUBMIT_BRIEF_TOOL_NAME,
} from './system_prompt';

type Tokens = Pick<ChatCompletionTokenCount, 'prompt' | 'completion' | 'total'>;

export interface ComposeBriefResult {
  brief: Brief;
  verification: VerificationSummary;
  model?: string;
  tokens: Tokens;
}

/** Thrown when the AI output can't be turned into a valid brief; carries the tokens used so far. */
export class BriefCompositionError extends Error {
  constructor(
    public readonly code: 'llm_error' | 'llm_output',
    message: string,
    public readonly tokens: Tokens
  ) {
    super(message);
  }
}

/** Provider statuses the inference plugin doesn't retry by default. */
const NON_RETRYABLE_STATUSES = new Set([400, 401, 402, 403, 404, 405, 406, 407, 409]);

/** The plugin's default retry policy minus tool validation errors, which get our single repair. */
const shouldRetry = (error: Error): boolean =>
  isInferenceProviderError(error)
    ? error.status === undefined || !NON_RETRYABLE_STATUSES.has(error.status)
    : isInferenceRequestAbortedError(error);

const parseArguments = (raw: string | undefined): ToolCallArguments => {
  try {
    const parsed: unknown = JSON.parse(raw ?? '');
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? { ...parsed }
      : {};
  } catch {
    return {};
  }
};

/** The problems go back as the response to the model's tool call, or as a user message without one. */
const repairMessages = (toolCall: ToolCall | undefined, errors: string[]): Message[] => {
  const problems = errors.slice(0, 20).map((error) => error.slice(0, 400));
  return toolCall
    ? [
        { role: MessageRole.Assistant, content: '', toolCalls: [toolCall] },
        {
          role: MessageRole.Tool,
          name: SUBMIT_BRIEF_TOOL_NAME,
          toolCallId: toolCall.toolCallId,
          response: { status: 'rejected', instructions: REPAIR_INSTRUCTIONS, problems },
        },
      ]
    : [
        {
          role: MessageRole.User,
          content: `${REPAIR_INSTRUCTIONS}\n\nProblems:\n${problems
            .map((p) => `- ${p}`)
            .join('\n')}`,
        },
      ];
};

/**
 * Compose → verify → (one repair) → verified brief; a second failure is `llm_output`, a connector
 * failure `llm_error`. Calls are streamed to keep token usage when the plugin rejects a tool call.
 */
export const composeBrief = async ({
  inferenceClient,
  evidence,
  signals,
  timeRange,
  abortSignal,
  logger,
  onStage,
}: {
  /** Bound to the resolved connector. */
  inferenceClient: BoundInferenceClient;
  evidence: Evidence;
  signals: readonly SignalOutcome[];
  timeRange: { from: string; to: string; range: string };
  abortSignal: AbortSignal;
  logger: Logger;
  onStage: (stage: 'compose' | 'verify') => Promise<void>;
}): Promise<ComposeBriefResult> => {
  const system = buildSystemPrompt();
  const messages: Message[] = [
    {
      role: MessageRole.User,
      content: buildUserMessage({
        formattedEvidence: formatEvidence(evidence, signals),
        timeRange,
      }),
    },
  ];
  const tokens: Tokens = { prompt: 0, completion: 0, total: 0 };
  let model: string | undefined;

  /** One forced `submit_brief` call; a tool call the plugin rejected is recovered for our own parse. */
  const callModel = async (
    conversation: Message[]
  ): Promise<{ toolCall?: ToolCall; error?: string }> => {
    let toolCall: ToolCall | undefined;
    try {
      await inferenceClient
        .chatComplete({
          system,
          messages: conversation,
          tools: { [SUBMIT_BRIEF_TOOL_NAME]: getSubmitBriefTool() },
          toolChoice: { function: SUBMIT_BRIEF_TOOL_NAME },
          abortSignal,
          stream: true,
          retryConfiguration: { retryOn: shouldRetry },
        })
        .forEach((event) => {
          if (isChatCompletionTokenCountEvent(event)) {
            tokens.prompt += event.tokens.prompt;
            tokens.completion += event.tokens.completion;
            tokens.total += event.tokens.total;
            model = event.model ?? model;
          } else if (isChatCompletionMessageEvent(event)) {
            toolCall = event.toolCalls.find(
              ({ function: fn }) => fn.name === SUBMIT_BRIEF_TOOL_NAME
            );
          }
        });
      return { toolCall };
    } catch (error) {
      if (!(error instanceof Error) || !isToolValidationError(error)) {
        const message = error instanceof Error ? error.message : String(error);
        throw new BriefCompositionError(
          'llm_error',
          `The AI connector call failed: ${message}`,
          tokens
        );
      }
      const failed = error.meta.toolCalls?.find(
        ({ function: fn }) => fn.name === SUBMIT_BRIEF_TOOL_NAME
      );
      return {
        toolCall: failed && {
          toolCallId: failed.toolCallId,
          function: {
            name: SUBMIT_BRIEF_TOOL_NAME,
            arguments: parseArguments(error.meta.arguments ?? failed.function.arguments),
          },
        },
        error: error.meta.errorsText ?? error.message,
      };
    }
  };

  /** `verified` only when the brief is usable; otherwise the problems only the model can fix. */
  const attempt = async (
    conversation: Message[]
  ): Promise<{ toolCall?: ToolCall; verified?: VerifyBriefResult; errors: string[] }> => {
    await onStage('compose');
    const { toolCall, error } = await callModel(conversation);
    await onStage('verify');
    if (!toolCall) {
      return {
        errors: [
          error ?? `No ${SUBMIT_BRIEF_TOOL_NAME} tool call was made; call it with the full brief.`,
        ],
      };
    }
    return withBriefSpan('verify', {}, async () => {
      const parsed = Brief.safeParse(toolCall.function.arguments);
      if (!parsed.success) {
        return {
          toolCall,
          errors: parsed.error.issues.map(
            ({ path, message }) => `invalid output: ${path.join('.') || '(root)'}: ${message}`
          ),
        };
      }
      const verified = verifyBrief(parsed.data, evidence, timeRange.range);
      verified.notes.forEach((note) => logger.debug(`Executive brief verification: ${note}`));
      const errors = verified.structuralErrors;
      return errors.length > 0 ? { toolCall, errors } : { toolCall, verified, errors };
    });
  };

  let current = await attempt(messages);
  const repaired = !current.verified;
  if (repaired) {
    logger.debug(`Executive brief needs a repair: ${current.errors.join(' | ')}`);
    current = await attempt([...messages, ...repairMessages(current.toolCall, current.errors)]);
  }
  if (!current.verified) {
    throw new BriefCompositionError(
      'llm_output',
      `The AI output failed verification after one repair: ${current.errors.slice(0, 5).join(' ')}`,
      tokens
    );
  }
  const { brief, summary } = current.verified;
  return { brief, verification: { ...summary, repaired }, ...(model ? { model } : {}), tokens };
};
