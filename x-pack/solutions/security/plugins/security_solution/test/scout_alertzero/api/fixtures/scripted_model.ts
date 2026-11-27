/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolCallMessage, type LlmProxy, type LLMMessage } from '@kbn/ftr-llm-proxy';
import type { ToolingLog } from '@kbn/tooling-log';

/** The chat completion request body the proxy hands to an interceptor. */
type ProxyRequestBody = Parameters<Parameters<LlmProxy['intercept']>[0]['when']>[0];
type ToolChoice = ProxyRequestBody['tool_choice'];

/** The forced tool call an Agent Builder agent makes for its structured answer. */
const STRUCTURED_ANSWER_TOOL = 'structured_answer';
/** Agent Builder wraps an output schema without a root type under this property. */
const STRUCTURED_ANSWER_PROPERTY = 'response';
/** Replies to the other forced calls of a review: the conversation title and the summary. */
const FIXED_TOOL_ARGS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  set_title: { title: 'Rule tuning review' },
  investigation_summary: { summary: 'The rule tuning review proposed a change to the rule.' },
};
/**
 * Interceptors kept registered at once. Agent Builder asks for a conversation title at the same
 * time as the agent's first model call, so one interceptor would leave one of them unanswered.
 */
const CONCURRENT_REQUESTS = 3;

const forcedToolName = (toolChoice: ToolChoice): string | undefined =>
  typeof toolChoice === 'object' && toolChoice !== null && 'function' in toolChoice
    ? toolChoice.function.name
    : undefined;

const hasReply = (toolName: string): boolean =>
  toolName === STRUCTURED_ANSWER_TOOL || FIXED_TOOL_ARGS[toolName] !== undefined;

/**
 * A plain text reply ends the agent's research phase, so the agent goes straight to its
 * structured answer. A forced call the model has no reply for also gets text.
 */
const reply = (toolChoice: ToolChoice, structuredAnswer: object): LLMMessage => {
  const toolName = forcedToolName(toolChoice);
  if (toolName === STRUCTURED_ANSWER_TOOL) {
    return createToolCallMessage(STRUCTURED_ANSWER_TOOL, {
      [STRUCTURED_ANSWER_PROPERTY]: structuredAnswer,
    });
  }
  const fixedArgs = toolName ? FIXED_TOOL_ARGS[toolName] : undefined;
  return fixedArgs && toolName
    ? createToolCallMessage(toolName, fixedArgs)
    : 'The investigation is complete.';
};

export interface ScriptedModel {
  /** Tool names of the forced calls the model answered with a tool call, in order. */
  answeredToolCalls: string[];
  /** Tool names of the forced calls the model had no reply for. A test expects none. */
  unansweredToolCalls: string[];
  /** Requests the proxy answered with an error because no interceptor was free. */
  unmatchedRequestCount: () => number;
  stop: () => void;
}

/** Answers every request to the LLM proxy until stopped, with `structuredAnswer` as the agent's answer. */
export const startScriptedModel = ({
  proxy,
  log,
  structuredAnswer,
}: {
  proxy: LlmProxy;
  log: ToolingLog;
  structuredAnswer: object;
}): ScriptedModel => {
  let stopped = false;
  const answeredToolCalls: string[] = [];
  const unansweredToolCalls: string[] = [];
  proxy.clear();

  // A proxy interceptor answers one request, and the wait for it ends after 30 seconds. An
  // interceptor whose wait has ended stays registered and would take a request without answering
  // it, so each one stops matching once its wait is over.
  const answerNextRequest = async (): Promise<void> => {
    let waiting = true;
    try {
      await proxy
        .intercept({
          name: 'scripted-model',
          // The proxy calls `responseMock` twice per request but `when` once, so the calls are
          // recorded here.
          when: ({ tool_choice: toolChoice }) => {
            if (!waiting || stopped) {
              return false;
            }
            const toolName = forcedToolName(toolChoice);
            if (toolName) {
              (hasReply(toolName) ? answeredToolCalls : unansweredToolCalls).push(toolName);
            }
            return true;
          },
          responseMock: ({ tool_choice: toolChoice }) => reply(toolChoice, structuredAnswer),
        })
        .completeAfterIntercept();
    } catch (err) {
      log.debug(`Scripted model: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      waiting = false;
    }
  };

  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    void (async () => {
      while (!stopped) {
        await answerNextRequest();
      }
    })();
  }

  return {
    answeredToolCalls,
    unansweredToolCalls,
    unmatchedRequestCount: () =>
      proxy.interceptedRequests.filter(({ matchingInterceptorName }) => !matchingInterceptorName)
        .length,
    stop: () => {
      stopped = true;
      proxy.clear();
    },
  };
};
