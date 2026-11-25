/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolCallMessage, type LlmProxy, type LLMMessage } from '@kbn/ftr-llm-proxy';
import type { ToolingLog } from '@kbn/tooling-log';

/** The forced tool call an Agent Builder agent makes for its structured answer. */
const STRUCTURED_ANSWER_TOOL = 'structured_answer';
/** Agent Builder wraps an output schema without a root type under this property. */
const STRUCTURED_ANSWER_PROPERTY = 'response';
/**
 * Arguments for the other forced tool calls a review makes: the title of a new conversation,
 * and the summary of the investigation.
 */
const FIXED_TOOL_ARGS: Readonly<Record<string, Record<string, unknown>>> = {
  set_title: { title: 'Rule tuning review' },
  investigation_summary: { summary: 'The rule tuning review proposed a change to the rule.' },
};

const forcedToolName = (toolChoice: unknown): string | undefined => {
  if (typeof toolChoice !== 'object' || toolChoice === null) {
    return undefined;
  }
  const name = (toolChoice as { function?: { name?: unknown } }).function?.name;
  return typeof name === 'string' ? name : undefined;
};

const hasReply = (toolName: string): boolean =>
  toolName === STRUCTURED_ANSWER_TOOL || FIXED_TOOL_ARGS[toolName] !== undefined;

/**
 * The reply of the scripted model to one request. A plain text reply ends the agent's research
 * phase, so the agent goes straight to its structured answer. A forced call the model has no
 * reply for also gets text, and the step that made it fails.
 */
const reply = (toolChoice: unknown, structuredAnswer: Record<string, unknown>): LLMMessage => {
  const toolName = forcedToolName(toolChoice);
  if (toolName === STRUCTURED_ANSWER_TOOL) {
    return createToolCallMessage(STRUCTURED_ANSWER_TOOL, {
      [STRUCTURED_ANSWER_PROPERTY]: structuredAnswer,
    });
  }
  if (toolName && FIXED_TOOL_ARGS[toolName]) {
    return createToolCallMessage(toolName, FIXED_TOOL_ARGS[toolName]);
  }
  return 'The investigation is complete.';
};

export interface ScriptedModel {
  /** Tool names of the forced calls the model answered with a tool call, in order. */
  answeredToolCalls: string[];
  /** Tool names of the forced calls the model had no reply for. A test expects none. */
  unansweredToolCalls: string[];
  stop: () => void;
}

/**
 * Answers every request to the LLM proxy until stopped: the agent's structured answer gets
 * `structuredAnswer`, and any other request gets a fixed reply.
 *
 * A proxy interceptor answers one request and expires 30 seconds after it is registered. The
 * worker reaches the model only after its sweep and the review have started, which can take
 * longer, so the model registers one interceptor at a time and registers a new one after each
 * answer or expiry. An expired interceptor stays in the proxy and would take the next request
 * without answering it, so the proxy is cleared before each registration.
 */
export const startScriptedModel = ({
  proxy,
  log,
  structuredAnswer,
}: {
  proxy: LlmProxy;
  log: ToolingLog;
  structuredAnswer: Record<string, unknown>;
}): ScriptedModel => {
  let stopped = false;
  const answeredToolCalls: string[] = [];
  const unansweredToolCalls: string[] = [];

  const answerNextRequest = async (): Promise<void> => {
    proxy.clear();
    try {
      await proxy
        .intercept({
          name: 'scripted-model',
          // The proxy calls `responseMock` twice per request but `when` once, so the calls are
          // recorded here. The model is the proxy's only interceptor.
          when: (body) => {
            const toolName = forcedToolName(body.tool_choice);
            if (toolName) {
              (hasReply(toolName) ? answeredToolCalls : unansweredToolCalls).push(toolName);
            }
            return true;
          },
          responseMock: (body) => reply(body.tool_choice, structuredAnswer),
        })
        .completeAfterIntercept();
    } catch (err) {
      // No request in the 30 seconds: register again.
      log.debug(`Scripted model: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  void (async () => {
    while (!stopped) {
      await answerNextRequest();
    }
  })();

  return {
    answeredToolCalls,
    unansweredToolCalls,
    stop: () => {
      stopped = true;
      proxy.clear();
    },
  };
};
