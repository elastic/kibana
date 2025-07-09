/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of } from 'rxjs';
import { type ToolCall, type AssistantMessage, MessageRole } from '@kbn/inference-common';
import type { SuggestionPayload } from '@kbn/observability-case-suggestion-registry-plugin/server';
import type { AnalyzeSuggestionsToolMessage } from './types';
import { ANALYZE_SUGGESTION_TOOL_NAME } from './tools';

export const callAnalyzeSuggestionTool = ({
  toolCall,
  finalSuggestions,
  pendingSuggestions,
}: {
  toolCall: ToolCall;
  finalSuggestions: Map<string, SuggestionPayload>;
  pendingSuggestions: Map<string, SuggestionPayload>;
}): Observable<AnalyzeSuggestionsToolMessage | AssistantMessage> => {
  const toolCallId = toolCall.toolCallId;
  const toolName = toolCall.function.name;
  const toolArguments = toolCall.function.arguments;

  const isRelevant = toolArguments.isRelevant;
  const suggestionId = toolArguments.suggestionId;

  if (isRelevant === undefined) {
    const errorMessage: AssistantMessage = {
      role: MessageRole.Assistant,
      text: `No suggestions available for tool ${toolName}.`,
    };
    return of(errorMessage);
  }

  if (isRelevant === false) {
    const toolMessage: AnalyzeSuggestionsToolMessage = {
      name: ANALYZE_SUGGESTION_TOOL_NAME,
      role: MessageRole.Tool,
      toolCallId,
      response: {
        approvedSuggestions: [],
        deninedSuggestions: pendingSuggestions.get(suggestionId)
          ? [pendingSuggestions.get(suggestionId)]
          : [],
      },
    };
    pendingSuggestions.delete(suggestionId);
    return of(toolMessage);
  }

  if (isRelevant) {
    const approvedSuggestion = pendingSuggestions.get(suggestionId);
    if (!approvedSuggestion) {
      const errorMessage: AssistantMessage = {
        role: MessageRole.Assistant,
        text: `Suggestion with id ${suggestionId} not found in pending suggestions.`,
      };
      return of(errorMessage);
    }
    finalSuggestions.set(suggestionId, approvedSuggestion);
  }

  pendingSuggestions.delete(suggestionId);

  const toolMessage: AnalyzeSuggestionsToolMessage = {
    name: ANALYZE_SUGGESTION_TOOL_NAME,
    role: MessageRole.Tool,
    toolCallId,
    response: {
      approvedSuggestions: Array.from(finalSuggestions.values()),
      deninedSuggestions: [],
    },
  };
  return of(toolMessage);
};
