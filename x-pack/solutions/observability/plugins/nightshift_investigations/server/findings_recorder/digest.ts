/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStepType,
  isToolCallStep,
  type ConversationRoundStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { REPLY_USER_TOOL_ID } from '../tools/reply_user/tool';
import { TIME_CONVERTER_TOOL_ID } from '../tools/time_converter/tool';
import { readsSeededKnowledge } from '../memory/transcript';
import {
  ANSWER_MAX_CHARS,
  DIGEST_COMMAND_CHARS,
  DIGEST_MAX_CHARS,
  DIGEST_REASONING_CHARS,
  DIGEST_RESULT_CHARS,
} from './constants';

const clip = (text: string, max: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

const resultText = ({ results }: ToolCallStep): string =>
  results
    .map(({ data }) => {
      const { stdout, stderr, text, message } = (data ?? {}) as Record<string, unknown>;
      const parts = [stdout, text, message, stderr].filter(
        (part): part is string => typeof part === 'string' && part.length > 0
      );
      return parts.length > 0 ? parts.join(' ') : JSON.stringify(data ?? {});
    })
    .join(' ');

const callText = ({ params }: ToolCallStep): string => {
  const { command, file_path: filePath, query } = (params ?? {}) as Record<string, unknown>;
  const value = [command, filePath, query].find((part) => typeof part === 'string');
  return typeof value === 'string' ? value : JSON.stringify(params ?? {});
};

const isNoise = (step: ToolCallStep): boolean =>
  step.tool_id === REPLY_USER_TOOL_ID ||
  step.tool_id === TIME_CONVERTER_TOOL_ID ||
  readsSeededKnowledge(step.tool_id, (step.params ?? {}) as Record<string, unknown>);

const renderStep = (step: ConversationRoundStep): string | undefined => {
  if (step.type === ConversationRoundStepType.reasoning) {
    if (step.transient || !step.reasoning) return undefined;
    return `Agent: ${clip(step.reasoning, DIGEST_REASONING_CHARS)}`;
  }
  if (isToolCallStep(step) && !isNoise(step)) {
    return `Tool ${step.tool_id}: ${clip(callText(step), DIGEST_COMMAND_CHARS)}\n  Result: ${clip(
      resultText(step),
      DIGEST_RESULT_CHARS
    )}`;
  }
  return undefined;
};

/**
 * The agent's final answer: the last `reply_user` response, else the round's response message.
 */
export const extractAnswer = ({
  steps,
  responseMessage,
}: {
  steps: readonly ConversationRoundStep[];
  responseMessage?: string;
}): string | undefined => {
  const reply = steps
    .filter(isToolCallStep)
    .filter(({ tool_id: toolId }) => toolId === REPLY_USER_TOOL_ID)
    .map(({ params }) => (params as { response?: unknown }).response)
    .filter((response): response is string => typeof response === 'string' && response.length > 0)
    .at(-1);
  const answer = reply ?? (responseMessage?.length ? responseMessage : undefined);
  return answer?.slice(0, ANSWER_MAX_CHARS);
};

/**
 * A bounded, plain-text view of what the investigation has done so far. The newest steps are
 * kept when the budget is exceeded, because they carry the current state of the reasoning.
 */
export const buildDigest = ({
  steps,
  maxChars = DIGEST_MAX_CHARS,
}: {
  steps: readonly ConversationRoundStep[];
  maxChars?: number;
}): string => {
  const rendered = steps.map(renderStep).filter((line): line is string => line !== undefined);

  const kept: string[] = [];
  let used = 0;
  for (let index = rendered.length - 1; index >= 0; index--) {
    const size = rendered[index].length + 1;
    if (used + size > maxChars) break;
    kept.unshift(rendered[index]);
    used += size;
  }
  const dropped = rendered.length - kept.length;
  return [...(dropped > 0 ? [`(${dropped} earlier steps omitted)`] : []), ...kept].join('\n');
};
