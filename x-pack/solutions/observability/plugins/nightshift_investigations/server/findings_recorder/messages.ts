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
import { MessageRole, type Message, type ToolCall } from '@kbn/inference-common';
import { REPLY_USER_TOOL_ID } from '../tools/reply_user/tool';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../tools/sandbox_bash/write_file_tool';
import { TIME_CONVERTER_TOOL_ID } from '../tools/time_converter/tool';
import { ANSWER_MAX_CHARS, QUESTION_MAX_CHARS, TOOL_RESULT_MAX_CHARS } from './constants';
import { LIVE_INSTRUCTION, FINAL_INSTRUCTION } from './prompt';

/** The tool the recorder answers with. Its earlier answers are replayed under this name. */
export const STRUCTURED_OUTPUT_TOOL = 'structuredOutput';

/**
 * One earlier recorder answer in this investigation. The recorder's conversation is the agent's
 * own, with each of these slotted in after the agent turns that existed when it was asked, so the
 * whole thing only ever grows at the end and a model provider can cache the prefix.
 */
export interface RecorderTurn {
  /** How many agent turns (tool call groups) preceded the question that produced this answer. */
  atGroups: number;
  final: boolean;
  /** The structured answer, as the model produced it. */
  answer: Record<string, unknown>;
}

interface AgentTurn {
  text?: string;
  calls: ToolCallStep[];
}

const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}… [${text.length - max} more characters]` : text;

/** One agent turn per `tool_call_group_id`: the text it wrote and the tools it called in parallel. */
export const groupTurns = (steps: readonly ConversationRoundStep[]): AgentTurn[] => {
  const turns: AgentTurn[] = [];
  let currentGroup: string | undefined;
  for (const step of steps) {
    if (step.type === ConversationRoundStepType.reasoning) {
      if (step.transient || !step.reasoning) continue;
      const group = step.tool_call_group_id;
      if (group !== undefined && group === currentGroup) {
        const turn = turns[turns.length - 1];
        turn.text = turn.text ? `${turn.text}\n${step.reasoning}` : step.reasoning;
      } else {
        turns.push({ text: step.reasoning, calls: [] });
        currentGroup = group;
      }
    } else if (isToolCallStep(step)) {
      const group = step.tool_call_group_id;
      if (turns.length === 0 || group !== currentGroup) {
        turns.push({ calls: [step] });
        currentGroup = group;
      } else {
        turns[turns.length - 1].calls.push(step);
      }
    }
  }
  return turns;
};

const resultText = ({ results }: ToolCallStep): string => {
  if (!results?.length) return '(no result)';
  return clip(
    results
      .map(({ data }) => {
        const { stdout, stderr, text, message } = (data ?? {}) as Record<string, unknown>;
        const parts = [stdout, text, message, stderr].filter(
          (part): part is string => typeof part === 'string' && part.length > 0
        );
        return parts.length > 0 ? parts.join(' ') : JSON.stringify(data ?? {});
      })
      .join('\n'),
    TOOL_RESULT_MAX_CHARS
  );
};

/** The messages an agent turn produced: what it said and asked for, then each tool's result. */
const turnMessages = ({ text, calls }: AgentTurn): Message[] => {
  const toolCalls: ToolCall[] = calls.map((call) => ({
    toolCallId: call.tool_call_id,
    function: { name: call.tool_id, arguments: (call.params ?? {}) as Record<string, never> },
  }));
  return [
    {
      role: MessageRole.Assistant,
      content: text ?? null,
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    },
    ...calls.map(
      (call): Message => ({
        role: MessageRole.Tool,
        name: call.tool_id,
        toolCallId: call.tool_call_id,
        response: resultText(call),
      })
    ),
  ];
};

export const countTurns = (steps: readonly ConversationRoundStep[]): number =>
  groupTurns(steps).length;

/**
 * The recorder's conversation, laid out like the agent's own:
 *
 *   the human message that started the investigation
 *   agent turn, its tool calls and results, agent turn, ...
 *   (the recorder is asked) instruction, then its structured answer
 *   agent turns that came after, ...
 *   (the recorder is asked again) instruction
 *
 * An earlier answer sits where it was given; the last instruction is the one still to answer.
 */
export const buildRecorderMessages = ({
  question,
  steps,
  turns: earlier,
  final,
  notices = [],
}: {
  question?: string;
  steps: readonly ConversationRoundStep[];
  turns: readonly RecorderTurn[];
  final: boolean;
  /** What people did to the investigation outside the agent's steps, such as changing its severity. */
  notices?: readonly string[];
}): Message[] => {
  const agentTurns = groupTurns(steps);
  const messages: Message[] = [
    {
      role: MessageRole.User,
      content: clip(question?.trim() || '(no question was recorded)', QUESTION_MAX_CHARS),
    },
  ];
  let cursor = 0;
  earlier.forEach((turn, index) => {
    const upTo = Math.min(turn.atGroups, agentTurns.length);
    for (; cursor < upTo; cursor++) messages.push(...turnMessages(agentTurns[cursor]));
    const toolCallId = `recorder-${index}`;
    messages.push(
      { role: MessageRole.User, content: turn.final ? FINAL_INSTRUCTION : LIVE_INSTRUCTION },
      {
        role: MessageRole.Assistant,
        content: null,
        toolCalls: [
          {
            toolCallId,
            function: {
              name: STRUCTURED_OUTPUT_TOOL,
              arguments: turn.answer as Record<string, never>,
            },
          },
        ],
      },
      {
        role: MessageRole.Tool,
        name: STRUCTURED_OUTPUT_TOOL,
        toolCallId,
        response: 'Recorded.',
      }
    );
  });
  for (; cursor < agentTurns.length; cursor++) messages.push(...turnMessages(agentTurns[cursor]));
  // Placed after the part of the conversation that is kept between passes, so they never move it.
  notices.forEach((notice) => messages.push({ role: MessageRole.User, content: notice }));
  messages.push({ role: MessageRole.User, content: final ? FINAL_INSTRUCTION : LIVE_INSTRUCTION });
  return messages;
};

/**
 * Tools the investigator can call. The recorder is given a definition for every one of them on
 * every pass, whether or not it has been called yet, so the tool list never changes between
 * passes. Providers cache tools ahead of the system prompt and the messages, so a list that grew
 * as the agent used new tools would throw the cached conversation away each time.
 */
const KNOWN_AGENT_TOOLS = [
  REPLY_USER_TOOL_ID,
  SANDBOX_BASH_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
  TIME_CONVERTER_TOOL_ID,
];

/** The tool names to define: the known ones, then any other the conversation calls, in a fixed order. */
export const toolNamesToDefine = (messages: readonly Message[]): string[] => {
  const names = new Set<string>(KNOWN_AGENT_TOOLS);
  for (const message of messages) {
    if (message.role === MessageRole.Assistant) {
      message.toolCalls?.forEach((call) => names.add(call.function.name));
    }
  }
  names.delete(STRUCTURED_OUTPUT_TOOL);
  return [...names].sort();
};

/** The agent's final answer: the last `reply_user` response, else the round's response message. */
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
