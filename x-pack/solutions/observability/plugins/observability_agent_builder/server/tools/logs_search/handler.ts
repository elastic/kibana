/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import { MessageRole, ToolChoiceType } from '@kbn/inference-common';
import type { Message, BoundInferenceClient } from '@kbn/inference-common';
import { buildSystemPrompt } from './system_prompt';
import { INNER_TOOL_DEFINITIONS, executeInnerTool } from './inner_tools';
import { MAX_ITERATIONS, MAX_ANSWER_CHARS } from './constants';

export interface LogsSearchParams {
  prompt: string;
  start: string;
  end: string;
  index: string;
}

export interface LogsSearchResult {
  answer: string;
  evidence: string;
  queryTrace: string[];
  finalQuery: string;
  iterations: number;
  totalLogsExamined: number;
  finalMatchCount: number;
  error?: string;
}

export async function logsSearchHandler({
  params,
  inferenceClient,
  esClient,
  logger,
}: {
  params: LogsSearchParams;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<LogsSearchResult> {
  const systemPrompt = buildSystemPrompt({
    index: params.index,
    start: params.start,
    end: params.end,
  });

  const messages: Message[] = [{ role: MessageRole.User, content: params.prompt }];

  const queryTrace: string[] = [];
  let finalQuery = '';
  let totalLogsExamined = 0;
  let finalMatchCount = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    logger.debug(
      `[logs_search] Iteration ${i + 1}/${MAX_ITERATIONS} — sending ${messages.length} messages`
    );

    const response = await inferenceClient.chatComplete({
      system: systemPrompt,
      messages,
      tools: INNER_TOOL_DEFINITIONS,
      toolChoice: ToolChoiceType.auto,
    });

    const assistantMessage: Message = {
      role: MessageRole.Assistant,
      content: response.content,
      toolCalls: response.toolCalls,
    };
    messages.push(assistantMessage);

    if (!response.toolCalls?.length) {
      logger.debug(`[logs_search] No tool calls at iteration ${i + 1} — returning text response`);
      return buildResult({
        answer: response.content || 'No answer provided.',
        evidence: '',
        queryTrace,
        finalQuery,
        iterations: i + 1,
        totalLogsExamined,
        finalMatchCount,
      });
    }

    for (const toolCall of response.toolCalls) {
      if (toolCall.function.name === 'answer') {
        const answerArgs = toolCall.function.arguments as Record<string, unknown>;
        logger.debug(`[logs_search] Answer provided at iteration ${i + 1}`);
        return buildResult({
          answer: String(answerArgs.answer ?? ''),
          evidence: String(answerArgs.evidence ?? ''),
          queryTrace,
          finalQuery,
          iterations: i + 1,
          totalLogsExamined,
          finalMatchCount,
        });
      }

      if (toolCall.function.name === 'search_logs') {
        const searchArgs = toolCall.function.arguments as Record<string, unknown>;
        const qs = String(searchArgs.query_string ?? '*');
        queryTrace.push(qs);
        finalQuery = qs;
      }

      const observation = await executeInnerTool(
        {
          toolCallId: toolCall.toolCallId,
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments as Record<string, unknown>,
          },
        },
        {
          esClient,
          index: params.index,
          start: params.start,
          end: params.end,
          logger,
        }
      );

      logger.debug(
        `[logs_search] Tool "${toolCall.function.name}" returned ${observation.length} chars`
      );

      const totalMatch = observation.match(/Total matching logs:\s*([\d,]+)/);
      if (totalMatch) {
        const count = parseInt(totalMatch[1].replace(/,/g, ''), 10);
        if (i === 0) {
          totalLogsExamined = count;
        }
        finalMatchCount = count;
      }

      const toolMessage: Message = {
        role: MessageRole.Tool,
        toolCallId: toolCall.toolCallId,
        response: observation,
        name: toolCall.function.name,
      };
      messages.push(toolMessage);
    }
  }

  logger.debug(`[logs_search] Reached max iterations (${MAX_ITERATIONS})`);

  return buildResult({
    answer: 'Investigation reached maximum iterations without a definitive conclusion.',
    evidence: '',
    queryTrace,
    finalQuery,
    iterations: MAX_ITERATIONS,
    totalLogsExamined,
    finalMatchCount,
    error: 'max_iterations_reached',
  });
}

function buildResult(result: LogsSearchResult): LogsSearchResult {
  return {
    ...result,
    answer: result.answer.slice(0, MAX_ANSWER_CHARS),
    evidence: result.evidence.slice(0, MAX_ANSWER_CHARS),
  };
}
