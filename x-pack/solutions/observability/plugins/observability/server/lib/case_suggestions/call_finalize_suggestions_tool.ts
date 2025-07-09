/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of } from 'rxjs';
import { type AssistantMessage, MessageRole } from '@kbn/inference-common';
import type { SuggestionPayload } from '@kbn/observability-case-suggestion-registry-plugin/server';
import { EMPTY_ASSISTANT_MESSAGE } from './empty_assistant_message';
import type { FinalizeSuggestionsToolMessage } from './types';
import { FINALIZE_SUGGESTIONS_TOOL_NAME } from './tools';

export const callFinalizeSuggestionsTool = ({
  toolCallId,
  finalSuggestions,
}: {
  toolCallId: string;
  finalSuggestions: Map<string, SuggestionPayload>;
}): Observable<FinalizeSuggestionsToolMessage | AssistantMessage> => {
  const toolMessage: FinalizeSuggestionsToolMessage = {
    name: FINALIZE_SUGGESTIONS_TOOL_NAME,
    role: MessageRole.Tool,
    toolCallId,
    response: {
      suggestions: Array.from(finalSuggestions.values()),
    },
  };
  return of(toolMessage, EMPTY_ASSISTANT_MESSAGE);
};
