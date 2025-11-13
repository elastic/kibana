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

export function setupToolCallThenAnswer({
  llmProxy,
  toolName,
  toolArg = {},
  title = 'Mocked conversation title',
  handoverResponse = 'handover',
  finalResponse = 'final',
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
