/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs';
import { v4 } from 'uuid';
import { ToolDefinition, isChatCompletionChunkEvent, isOutputEvent } from '@kbn/inference-common';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/common';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import {
  MessageAddEvent,
  MessageRole,
  StreamingChatResponseEventType,
  EXECUTE_QUERY_FUNCTION_NAME,
  QUERY_FUNCTION_NAME,
  VISUALIZE_QUERY_FUNCTION_NAME,
} from '@kbn/observability-ai-assistant-plugin/common';
import { createFunctionResponseMessage } from '@kbn/observability-ai-assistant-plugin/common/utils/create_function_response_message';
import { convertMessagesForInference } from '@kbn/observability-ai-assistant-plugin/common/convert_messages_for_inference';
import { runAndValidateEsqlQuery } from './validate_esql_query';
import type { FunctionRegistrationParameters } from '..';

export function registerQueryFunction({
  functions,
  resources,
  pluginsStart,
  signal,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: EXECUTE_QUERY_FUNCTION_NAME,
      isInternal: true,
      description: `Execute a generated ES|QL query on behalf of the user. The results
        will be returned to you.

        You must use this tool if the user is asking for the result of a query,
        such as a metric or list of things, but does not want to visualize it in
        a table or chart. You do NOT need to ask permission to execute the query
        after generating it, use the "${EXECUTE_QUERY_FUNCTION_NAME}" tool directly instead.

        **EXCEPTION**: Do NOT use when the user just asks for an **EXAMPLE**.`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
          },
        },
        required: ['query'],
      } as const,
    },
    async ({ arguments: { query } }) => {
      const correctedQuery = correctCommonEsqlMistakes(query).output;

      const client = (await resources.context.core).elasticsearch.client.asCurrentUser;
      const { error, errorMessages, rows, columns } = await runAndValidateEsqlQuery({
        query: correctedQuery,
        client,
        signal,
      });

      if (!!error) {
        return {
          content: {
            message: 'The query failed to execute',
            error,
            errorMessages,
          },
        };
      }

      return {
        content: {
          columns,
          rows,
        },
      };
    }
  );

  functions.registerFunction(
    {
      name: QUERY_FUNCTION_NAME,
      description: `This tool generates, executes and/or visualizes a query
      based on the user's request. It also explains how ES|QL works and how to
      convert queries from one language to another. Make sure you call one of
      the get_dataset functions first if you need index or field names. This
      tool takes no input.`,
    },
    async ({ messages, connectorId, simulateFunctionCalling }) => {
      const esqlFunctions = functions
        .getFunctions()
        .filter(
          (fn) =>
            fn.definition.name === EXECUTE_QUERY_FUNCTION_NAME ||
            fn.definition.name === VISUALIZE_QUERY_FUNCTION_NAME
        )
        .map((fn) => fn.definition);

      const actions = functions.getActions();

      const inferenceMessages = convertMessagesForInference(
        // remove system message and query function request
        messages.filter((message) => message.message.role !== MessageRole.System).slice(0, -1),
        resources.logger
      );

      const availableToolDefinitions = Object.fromEntries(
        [...actions, ...esqlFunctions].map((fn) => [
          fn.name,
          { description: fn.description, schema: fn.parameters } as ToolDefinition,
        ])
      );
      const events$ = naturalLanguageToEsql({
        client: pluginsStart.inference.getClient({ request: resources.request }),
        connectorId,
        messages: inferenceMessages,
        logger: resources.logger,
        tools: availableToolDefinitions,
        functionCalling: simulateFunctionCalling ? 'simulated' : 'auto',
        maxRetries: 0,
        metadata: {
          connectorTelemetry: {
            pluginId: 'observability_ai_assistant',
          },
        },
        system: `
--- CRITICAL INSTRUCTIONS FOR THIS TURN ---
 1. **CHECK YOUR TOOLS FIRST.** Your capabilities are strictly limited to the tools listed in the \`== AVAILABLE TOOLS ==\` section below.
 2. **DISREGARD PAST TOOLS.** 
  * Under NO circumstances should you use any tool that is not explicitly defined in the \`== AVAILABLE TOOLS ==\` section for THIS turn. 
  * Tools used or mentioned in previous parts of the conversation are NOT available unless they are listed below. 
  * Calling unavailable tools will result in a **critical error and task failure**.
== AVAILABLE TOOLS == 
 * These are the only known and available tools for use: 
      \`\`\`json
      ${JSON.stringify(availableToolDefinitions, null, 4)}
      \'\'\'
 * ALL OTHER tools not listed here are **NOT AVAILABLE** and calls to them will **FAIL**.
  `,
      });

      const chatMessageId = v4();

      return events$.pipe(
        map((event) => {
          if (isOutputEvent(event)) {
            return createFunctionResponseMessage({
              content: {},
              name: QUERY_FUNCTION_NAME,
              data: event.output,
            });
          }
          if (isChatCompletionChunkEvent(event)) {
            return {
              id: chatMessageId,
              type: StreamingChatResponseEventType.ChatCompletionChunk,
              message: {
                content: event.content,
              },
            };
          }

          const fnCall = event.toolCalls[0]
            ? {
                name: event.toolCalls[0].function.name,
                arguments: JSON.stringify(event.toolCalls[0].function.arguments),
                trigger: MessageRole.Assistant as const,
              }
            : undefined;

          const messageAddEvent: MessageAddEvent = {
            type: StreamingChatResponseEventType.MessageAdd,
            id: chatMessageId,
            message: {
              '@timestamp': new Date().toISOString(),
              message: {
                content: event.content,
                role: MessageRole.Assistant,
                function_call: fnCall,
              },
            },
          };

          return messageAddEvent;
        })
      );
    }
  );
}
