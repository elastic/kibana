/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import {
  mockTitleGeneration,
  mockAgentToolCall,
  mockHandoverToAnswer,
  mockFinalAnswer,
} from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/proxy_scenario/calls';
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
