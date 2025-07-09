/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import { MessageRole, AssistantMessage, ToolChoiceType } from '@kbn/inference-common';
import { type ToolDefinition, InferenceClient } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { pick } from 'lodash';
import moment from 'moment';
import { catchError, filter, map, mergeMap, Observable, of, switchMap } from 'rxjs';
import { ObservabilityAIAssistantClient } from '@kbn/observability-ai-assistant-plugin/server';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  CaseSuggestionRegistry,
  type SuggestionPayload,
} from '@kbn/observability-case-suggestion-registry-plugin/server';
import { EVALUATION_TOOLS } from './tools';
import { ToolErrorMessage } from './types';
import { callTools } from './util/call_tools';
import { CASE_SUGGESTION_SYSTEM_PROMPT_BASE } from './prompts';
import { ANALYZE_SUGGESTION_TOOL_NAME, FINALIZE_SUGGESTIONS_TOOL_NAME } from './tools';
import type {
  CaseSuggestionEvent,
  AnalyzeSuggestionsToolMessage,
  FinalizeSuggestionsToolMessage,
  CaseSuggestionHandlerToolMessage,
} from './types';
import { callChooseSuggestionTool } from './call_choose_suggestions_tools';
import { callAnalyzeSuggestionTool } from './call_analyze_suggestion_tool';
import { callFinalizeSuggestionsTool } from './call_finalize_suggestions_tool';

const SYSTEM_PROMPT_WITH_OBSERVE_INSTRUCTIONS = `${CASE_SUGGESTION_SYSTEM_PROMPT_BASE}

Your next step is to request an analysis of signal suggestions from another agent based
on the initial context or the results of previous suggestion requests.`;

// const SYSTEM_PROMPT_WITH_DECISION_INSTRUCTIONS = `${CASE_SUGGESTION_SYSTEM_PROMPT_BASE}

// ${RCA_PROMPT_ENTITIES}

// ${RCA_PROMPT_CHANGES}

//   To determine whether to end the process or continue analyzing another entity,
// follow the advice from the previous observation, and these tips:

//   Continuing the process:
//   - Do not investigate an entity twice. This will result in a failure.
//   - Logs, traces, or observability data that suggest upstream or downstream
// issues (such as connection failures, timeouts, or authentication errors)
// indicate further investigation is required.

//   Ending the process:
//   - No further entities to investigate: If there are no unexplored upstream or
// downstream dependencies, and all related entities have been investigated without
// discovering new anomalies, it may be appropriate to end the process.
//   - If all investigated entities (e.g., services, hosts, containers) are
// functioning normally, with no relevant issues found, and there are no signs of
// dependencies being affected, you may consider ending the process.
//   - Avoid concluding the investigation based solely on symptoms or the absence
// of immediate errors in the data. Unless a system change has been connected to
// the incident, it is important to continue investigating dependencies to ensure
// the root cause has been accurately identified.`;

export function runCaseSuggestions({
  serviceName,
  start: requestedStart,
  end: requestedEnd,
  connectorId,
  inferenceClient,
  context: initialContext,
  logger: incomingLogger,
  prevEvents,
  caseSuggestionRegistry,
}: {
  context: string;
  serviceName: string;
  logger: Logger;
  inferenceClient: InferenceClient;
  start: number;
  end: number;
  esClient: TracedElasticsearchClient;
  observabilityAIAssistantClient: ObservabilityAIAssistantClient;
  connectorId: string;
  spaceId: string;
  prevEvents?: CaseSuggestionEvent[];
  caseSuggestionRegistry: CaseSuggestionRegistry;
}): Observable<CaseSuggestionEvent> {
  const logger = incomingLogger.get('rca');
  const suggestionTools = caseSuggestionRegistry.getAllTools();
  const suggestionToolNames = Object.keys(suggestionTools);
  const pendingSuggestions: Map<string, SuggestionPayload> = new Map();
  const finalSuggestions: Map<string, SuggestionPayload> = new Map();

  const bucketSize = calculateAuto
    .atLeast(30, moment.duration(requestedEnd - requestedStart))!
    .asMilliseconds();

  const start = Math.floor(requestedStart / bucketSize) * bucketSize;
  const end = Math.floor(requestedEnd / bucketSize) * bucketSize;

  const initialMessage = {
    role: MessageRole.User as const,
    content: `You are assisting with an ongoing incident investigation using Elastic Observability. 
    
    The user is working within a "case"—a workspace that aggregates observability signals believed to be related to the same incident. 
    
    A case can contain alerts, logs, traces, SLOs, synthetic test failures, and other observability signals. 
    These signals help engineers understand the scope, root cause, and impact of the incident.

    Your goal is to recommend potentially related signals that may help the user understand the incident better.

    These recommendations are called suggestions. A suggestion represents a potential category of 
    related signals—such as SLO degradation, log anomalies, or failed synthetic tests. Each suggestion 
    includes one or more tools that describe *how* to find those signals. 

    After you propose a suggestion and select the strategy to apply, the system will run a tool that queries for relevant data. 
    Once the results are returned, you must evaluate them. Your evaluation should determine whether the results:
    - Are relevant to the current incident
    - Provide useful investigative context
    - Should be included in the case or discarded

    Avoid including weak or noisy results unless they clearly contribute to the user’s understanding of the incident.

    To summarize, your responsibilities are to:
    1. Review the current contents of the case
    2. Identify suggestion types that may be helpful
    3. Select appropriate strategies for each suggestion
    4. Evaluate the results of each executed strategy
    5. Finalize and explain which signals should be added to the case, and why
    
    The service name associated with this case is "${serviceName}".
    
    You will first be presented with available suggestion types to choose from. Use the context of the case to select the most relevant suggestion types.`,
  };

  const nextEvents = [initialMessage, ...(prevEvents ?? [])];

  const investigationTimeRangePrompt = `## Time range
  
    The time range of the investigation is ${new Date(start).toISOString()} until ${new Date(
    end
  ).toISOString()}`;

  initialContext = `${initialContext}

  ${investigationTimeRangePrompt}
  `;

  const next$ = callTools(
    {
      system: CASE_SUGGESTION_SYSTEM_PROMPT_BASE,
      connectorId,
      inferenceClient,
      messages: nextEvents,
      logger,
    },
    ({ messages }) => {
      const hasPendingSuggestions = pendingSuggestions.size > 0;
      const shouldChooseSuggestions = !hasPendingSuggestions;

      let nextTools: Record<string, ToolDefinition> = {};

      if (!hasPendingSuggestions) {
        nextTools = {
          ...suggestionTools,
          ...pick(EVALUATION_TOOLS, FINALIZE_SUGGESTIONS_TOOL_NAME),
        };
      }

      if (hasPendingSuggestions) {
        nextTools = pick(EVALUATION_TOOLS, ANALYZE_SUGGESTION_TOOL_NAME);
      }

      // TODO: Add logic to determine prompt
      const nextSystem = shouldChooseSuggestions
        ? SYSTEM_PROMPT_WITH_OBSERVE_INSTRUCTIONS
        : SYSTEM_PROMPT_WITH_OBSERVE_INSTRUCTIONS;

      return {
        messages,
        system: `${nextSystem}

        ${investigationTimeRangePrompt}`,
        tools: nextTools,
        toolChoice: hasPendingSuggestions
          ? { function: ANALYZE_SUGGESTION_TOOL_NAME }
          : ToolChoiceType.required,
      };
    },
    ({
      toolCalls,
      messages,
    }): Observable<
      | ToolErrorMessage
      | AnalyzeSuggestionsToolMessage
      | FinalizeSuggestionsToolMessage
      | AssistantMessage
    > => {
      return of(undefined).pipe(
        switchMap(() => {
          return of(...toolCalls).pipe(
            mergeMap((toolCall) => {
              function executeToolCall(): Observable<
                | AnalyzeSuggestionsToolMessage
                | FinalizeSuggestionsToolMessage
                | CaseSuggestionHandlerToolMessage
                | ToolErrorMessage
                | AssistantMessage
              > {
                switch (true) {
                  case suggestionToolNames.includes(toolCall.function.name):
                    return callChooseSuggestionTool({
                      pendingSuggestions,
                      caseSuggestionRegistry,
                      toolCall,
                    });

                  case toolCall.function.name === ANALYZE_SUGGESTION_TOOL_NAME:
                    return callAnalyzeSuggestionTool({
                      finalSuggestions,
                      pendingSuggestions,
                      toolCall,
                    });

                  case toolCall.function.name === FINALIZE_SUGGESTIONS_TOOL_NAME:
                    return callFinalizeSuggestionsTool({
                      toolCallId: toolCall.toolCallId,
                      finalSuggestions,
                    });
                }
              }

              return executeToolCall().pipe(
                catchError((error) => {
                  logger.error(`Failed executing task: ${error.message}`);
                  logger.error(error);
                  const toolErrorMessage: ToolErrorMessage = {
                    name: 'error',
                    role: MessageRole.Tool,
                    response: {
                      error: {
                        ...('toJSON' in error && typeof error.toJSON === 'function'
                          ? error.toJSON()
                          : {}),
                        message: error.message,
                      },
                    },
                    toolCallId: toolCall.toolCallId,
                  };
                  return of(toolErrorMessage);
                })
              );
            }, 3)
          );
        })
      );
    }
  );

  return next$.pipe(
    filter((event) =>
      Boolean(event.role !== MessageRole.Assistant || event.content || event.toolCalls?.length)
    ),
    map((event) => {
      if (event.role === MessageRole.Assistant) {
        return event as Extract<CaseSuggestionEvent, AssistantMessage>;
      }
      return event;
    })
  );
}
