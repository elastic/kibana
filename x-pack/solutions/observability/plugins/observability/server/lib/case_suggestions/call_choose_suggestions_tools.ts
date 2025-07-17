/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of, from, switchMap } from 'rxjs';
import {
  type ToolCall,
  type AssistantMessage,
  type ToolMessage,
  MessageRole,
} from '@kbn/inference-common';
import type {
  CaseSuggestionRegistry,
  SuggestionPayload,
} from '@kbn/observability-case-suggestion-registry-plugin/server';

export const callChooseSuggestionTool = ({
  toolCall,
  caseSuggestionRegistry,
  pendingSuggestions,
}: {
  toolCall: ToolCall;
  caseSuggestionRegistry: CaseSuggestionRegistry;
  pendingSuggestions: Map<string, SuggestionPayload>;
}): Observable<ToolMessage<string, SuggestionPayload> | AssistantMessage> => {
  const toolCallId = toolCall.toolCallId;
  const toolName = toolCall.function.name;
  const toolArguments = toolCall.function.arguments;
  const toolHandlers = caseSuggestionRegistry.getAllToolHandlers();

  return from(toolHandlers[toolName]?.(toolArguments)).pipe(
    switchMap((result: SuggestionPayload<Record<string, unknown>, Record<string, unknown>>) => {
      // if (!result) {
      //   const errorMessage: AssistantMessage = {
      //     role: MessageRole.Assistant,
      //     text: `No suggestions available for tool ${toolName}.`,
      //   };
      //   return of(errorMessage);
      // }

      const suggestionId = result.suggestionId;
      const suggestionData = result.data;

      pendingSuggestions.set(suggestionId, result);

      const toolMessage: ToolMessage<
        string,
        SuggestionPayload<Record<string, unknown>, Record<string, unknown>>
      > = {
        name: toolName,
        role: MessageRole.Tool,
        toolCallId,
        response: {
          suggestionId,
          data: suggestionData,
        },
      };
      return of(toolMessage);
    })
  );
};
