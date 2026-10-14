/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  BoundInferenceClient,
  Message,
  ToolCall,
  ToolCallArguments,
} from '@kbn/inference-common';
import {
  createInferenceInternalError,
  isInferenceProviderError,
  isInferenceRequestAbortedError,
  isToolValidationError,
  MessageRole,
} from '@kbn/inference-common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate, BriefFact } from './brief_types';
import { BriefDraft } from './brief_types';
import {
  buildUserMessage,
  getSubmitBriefTool,
  REPAIR_INSTRUCTIONS,
  SUBMIT_BRIEF_TOOL_NAME,
  SYSTEM_PROMPT,
} from './brief_prompt';

/** Provider statuses the inference plugin doesn't retry by default. */
const NON_RETRYABLE_STATUSES = new Set([400, 401, 402, 403, 404, 405, 406, 407, 409]);

/** The plugin's default retry policy minus tool validation errors, which get our single repair. */
const shouldRetry = (error: Error): boolean => {
  if (isInferenceProviderError(error)) {
    return error.status === undefined || !NON_RETRYABLE_STATUSES.has(error.status);
  }
  return isInferenceRequestAbortedError(error);
};

interface Attempt {
  toolCall?: ToolCall;
  draft?: BriefDraft;
  errors: string[];
}

/** Composes the draft with one forced tool call, repairing a schema-invalid answer once. */
export const composeBrief = async ({
  inferenceClient,
  scope,
  candidates,
  facts,
  coverage,
  abortSignal,
  logger,
}: {
  inferenceClient: BoundInferenceClient;
  scope: EntityAnalyticsScope;
  candidates: BriefCandidate[];
  facts: BriefFact[];
  coverage: string;
  abortSignal?: AbortSignal;
  logger: Logger;
}): Promise<{ draft: BriefDraft; repaired: boolean }> => {
  const messages: Message[] = [
    { role: MessageRole.User, content: buildUserMessage({ scope, candidates, facts, coverage }) },
  ];

  const callModel = async (conversation: Message[]): Promise<Attempt> => {
    try {
      const { toolCalls } = await inferenceClient.chatComplete({
        system: SYSTEM_PROMPT,
        messages: conversation,
        tools: { [SUBMIT_BRIEF_TOOL_NAME]: getSubmitBriefTool() },
        toolChoice: { function: SUBMIT_BRIEF_TOOL_NAME },
        // The same view should give the same brief. Models without temperature support drop it.
        temperature: 0,
        abortSignal,
        retryConfiguration: { retryOn: shouldRetry },
      });
      const toolCall = toolCalls.find(({ function: fn }) => fn.name === SUBMIT_BRIEF_TOOL_NAME);
      return parseToolCall(toolCall);
    } catch (error) {
      if (!isToolValidationError(error)) {
        throw error;
      }
      // The plugin rejected the arguments against the JSON schema: recover them for the repair.
      const failed = error.meta.toolCalls?.find(
        ({ function: fn }) => fn.name === SUBMIT_BRIEF_TOOL_NAME
      );
      const toolCall = failed && {
        toolCallId: failed.toolCallId,
        function: {
          name: SUBMIT_BRIEF_TOOL_NAME,
          arguments: parseArguments(error.meta.arguments ?? failed.function.arguments),
        },
      };
      return { toolCall, errors: [error.meta.errorsText ?? error.message] };
    }
  };

  const first = await callModel(messages);
  if (first.draft) {
    return { draft: first.draft, repaired: false };
  }
  logger.debug(
    `AI brief needs a repair: ${first.errors.join(' | ')}; got keys [${Object.keys(
      first.toolCall?.function.arguments ?? {}
    ).join(', ')}]`
  );
  const second = await callModel([...messages, ...repairMessages(first.toolCall, first.errors)]);
  if (!second.draft) {
    throw createInferenceInternalError(
      `The AI output did not match the brief schema after one repair: ${second.errors
        .slice(0, 5)
        .join(' ')}`
    );
  }
  return { draft: second.draft, repaired: true };
};

const parseToolCall = (toolCall: ToolCall | undefined): Attempt => {
  if (!toolCall) {
    return { errors: [`No ${SUBMIT_BRIEF_TOOL_NAME} tool call was made; call it with the brief.`] };
  }
  const parsed = BriefDraft.safeParse(toolCall.function.arguments);
  if (!parsed.success) {
    return {
      toolCall,
      errors: parsed.error.issues.map(
        ({ path, message }) => `invalid output: ${path.join('.') || '(root)'}: ${message}`
      ),
    };
  }
  return { toolCall, draft: parsed.data, errors: [] };
};

const parseArguments = (raw: string | undefined): ToolCallArguments => {
  try {
    const parsed: unknown = JSON.parse(raw ?? '');
    const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    return isObject ? { ...parsed } : {};
  } catch {
    return {};
  }
};

/** The problems go back as the response to the model's tool call, or as a user message without one. */
const repairMessages = (toolCall: ToolCall | undefined, errors: string[]): Message[] => {
  const problems = errors.slice(0, 20).map((error) => error.slice(0, 400));
  if (!toolCall) {
    const list = problems.map((problem) => `- ${problem}`).join('\n');
    return [{ role: MessageRole.User, content: `${REPAIR_INSTRUCTIONS}\n\nProblems:\n${list}` }];
  }
  return [
    { role: MessageRole.Assistant, content: '', toolCalls: [toolCall] },
    {
      role: MessageRole.Tool,
      name: SUBMIT_BRIEF_TOOL_NAME,
      toolCallId: toolCall.toolCallId,
      response: { status: 'rejected', instructions: REPAIR_INSTRUCTIONS, problems },
    },
  ];
};
