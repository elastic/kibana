/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import {
  mockTitleGeneration,
  mockAgentToolCall,
  mockHandoverToAnswer,
  mockFinalAnswer,
} from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/proxy_scenario/calls';
import { createToolCallMessage } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { LLM_PROXY_FINAL_MESSAGE } from './constants';

const MOCKED_TITLE = 'Mocked conversation title';

export function setupToolCallThenAnswer({
  llmProxy,
  toolName,
  toolArg = {},
  title = MOCKED_TITLE,
  handoverResponse = 'handover',
  finalResponse = LLM_PROXY_FINAL_MESSAGE,
}: {
  llmProxy: LlmProxy;
  toolName: string;
  toolArg?: Record<string, unknown>;
  title?: string;
  handoverResponse?: string;
  finalResponse?: string;
}) {
  mockTitleGeneration(llmProxy, title);

  mockAgentToolCall({
    llmProxy,
    toolName,
    toolArg,
  });

  mockHandoverToAnswer(llmProxy, handoverResponse);

  mockFinalAnswer(llmProxy, finalResponse);
}

function interceptSelectRelevantAlertFields({
  llmProxy,
  fieldIds = [],
}: {
  llmProxy: LlmProxy;
  fieldIds?: string[];
}) {
  void llmProxy.interceptors.toolChoice({
    name: 'structuredOutput',
    response: createToolCallMessage('structuredOutput', {
      fieldIds,
    }),
  });
}

function mockAssistantHandover(llmProxy: LlmProxy, reply: string = 'handover') {
  void llmProxy.interceptors.userMessage({
    name: 'handover-to-answer',
    when: ({ messages }) => {
      // Match against the most recent assistant and user messages in this request
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const assistantMsg = lastAssistant?.content as string;
      const userMsg = lastUser?.content as string;
      return (
        typeof assistantMsg === 'string' &&
        assistantMsg.includes('[researcher agent] Finished the research step. Handover') &&
        typeof userMsg === 'string' &&
        userMsg.startsWith('Ack. forwarding to answering agent')
      );
    },
    response: reply,
  });
}

export function setupObservabilityAlertsToolThenAnswer({
  llmProxy,
  toolArg,
  title = MOCKED_TITLE,
  fieldIds = [],
  finalResponse = LLM_PROXY_FINAL_MESSAGE,
}: {
  llmProxy: LlmProxy;
  toolArg: Record<string, unknown>;
  title?: string;
  fieldIds?: string[];
  finalResponse?: string;
}) {
  mockTitleGeneration(llmProxy, title);

  mockAgentToolCall({
    llmProxy,
    toolName: 'observability_get_alerts',
    toolArg,
  });

  interceptSelectRelevantAlertFields({ llmProxy, fieldIds });

  mockFinalAnswer(llmProxy, finalResponse);
}
