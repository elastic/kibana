/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ToolMessage,
  UserMessage,
  ToolCallsOf,
  ToolChoice,
  AssistantMessageOf,
} from '@kbn/inference-common';
import { SuggestionPayload } from '@kbn/observability-case-suggestion-registry-plugin/server';
import {
  EVALUATION_TOOLS,
  ANALYZE_SUGGESTION_TOOL_NAME,
  FINALIZE_SUGGESTIONS_TOOL_NAME,
} from './tools';

export type FinalizeSuggestionsToolMessage = ToolMessage<
  typeof FINALIZE_SUGGESTIONS_TOOL_NAME,
  {
    suggestions: SuggestionPayload[];
  }
>;

export type AnalyzeSuggestionsToolMessage = ToolMessage<
  typeof ANALYZE_SUGGESTION_TOOL_NAME,
  {
    approvedSuggestions: SuggestionPayload[];
    deninedSuggestions: SuggestionPayload[];
  }
>;

export type CaseSuggestionHandlerToolMessage = ToolMessage<string, SuggestionPayload>;

export type ToolErrorMessage = ToolMessage<
  'error',
  {
    error: {
      message: string;
    };
  }
>;

export type CaseSuggestionEvent =
  | ToolErrorMessage
  | UserMessage
  | AssistantMessageOf<{
      tools: typeof EVALUATION_TOOLS; // Ensure this type matches the definition in tools.ts
      toolChoice?: ToolChoice<keyof typeof EVALUATION_TOOLS>;
    }>;

export type CaseSuggestionToolRequest<
  TToolName extends keyof typeof EVALUATION_TOOLS = keyof typeof EVALUATION_TOOLS
> = ToolCallsOf<{
  tools: Pick<typeof EVALUATION_TOOLS, TToolName>;
}>['toolCalls'][number];

export type CaseSuggestionsToolMessage =
  | FinalizeSuggestionsToolMessage
  | AnalyzeSuggestionsToolMessage
  | CaseSuggestionHandlerToolMessage;
