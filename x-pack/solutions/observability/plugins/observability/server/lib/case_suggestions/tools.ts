/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// const CHOOSE_APPLICABLE_SUGGESTIONS_TOOL_NAME = 'chooseAvailableSuggestionsForCase';
// const RUN_SUGGESTION_STRATEGY_TOOL_NAME = 'runSuggestionStrategy';
// const ANALYZE_SUGGESTION_RESULT_TOOL_NAME = 'analyzeSuggestionResult';

/* Steps
 * 1. Request available suggestions for the case
 * 2. Choose applicable suggestions and applicable strategies to fetch suggestions
 * 3. Run the chosen suggestion strategies
 * 4. Analyze the results of the suggestion strategies
 * 5. Return applicable suggestions
 */
import { type ToolDefinition } from '@kbn/inference-common';

export const GET_SUGGESTION_OPTIONS_TOOL_NAME = 'requestSuggestionsForCase';
export const ANALYZE_SUGGESTION_TOOL_NAME = 'analyzeSuggestionForCase';
export const FINALIZE_SUGGESTIONS_TOOL_NAME = 'finalizeSuggestionsForCase';

export const EVALUATION_TOOLS: Record<string, ToolDefinition> = {
  [ANALYZE_SUGGESTION_TOOL_NAME]: {
    description: `Determine whether the provided suggestions are relevant to the case. Evaluate one suggestion at a time.
    When determining the suggestionType, use the type of suggestion that was returned by the suggestion strategy tool.`,
    schema: {
      type: 'object',
      properties: {
        suggestionId: {
          type: 'string',
          description: `Id of suggestion, e.g., 'slo_correlation'`,
        },
        isRelevant: {
          type: 'boolean',
          description: `Indicates whether the suggestion is relevant to the incident case. If true,
              the suggestion should be considered for further investigation or action.`,
        },
        relevancyReason: {
          type: 'string',
          description: `A natural language explanation of why the suggestion is relevant or not relevant to the incident case.
              This should provide context for the decision made.`,
        },
      },
    },
  },
  [FINALIZE_SUGGESTIONS_TOOL_NAME]: {
    description: `Indicate that you are done evaluating suggestions.`,
  },
};
