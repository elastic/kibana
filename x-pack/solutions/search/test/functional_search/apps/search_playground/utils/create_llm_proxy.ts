/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import getPort from 'get-port';
import { v4 as uuidv4 } from 'uuid';
import http, { type Server } from 'http';
import { isString, once, pull, isFunction, last, first } from 'lodash';
import { TITLE_CONVERSATION_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/service/client/operators/get_generated_title';
import pRetry from 'p-retry';
import type { ChatCompletionChunkToolCall } from '@kbn/inference-common';
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { SCORE_SUGGESTIONS_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/context/utils/score_suggestions';
import {
  MessageRole,
  SELECT_RELEVANT_FIELDS_NAME,
} from '@kbn/observability-ai-assistant-plugin/common';
import { createOpenAiChunk, createOpenAIResponse } from './create_openai_chunk';

type Request = http.IncomingMessage;
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };

export type LLMMessage = string[] | ToolMessage | string | undefined;

type RequestHandler = (
  request: Request,
  response: Response,
  requestBody: ChatCompletionStreamParams
) => void;

interface RequestInterceptor {
  name: string;
  when: (body: ChatCompletionStreamParams) => boolean;
}

export interface ToolMessage {
  content?: string;
  tool_calls?: ChatCompletionChunkToolCall[];
}

export interface RelevantField {
  id: string;
  name: string;
}

export interface KnowledgeBaseDocument {
  id: string;
  text: string;
}

export interface LlmResponseSimulator {
  requestBody: ChatCompletionStreamParams;
  status: (code: number) => void;
  next: (msg: string | ToolMessage) => Promise<void>;
  error: (error: any) => Promise<void>;
  complete: () => Promise<void>;
  rawWrite: (chunk: string) => Promise<void>;
  rawEnd: () => Promise<void>;
  stream: boolean;
}

export class LlmProxy {
  server: Server;
  interval: NodeJS.Timeout;
  interceptors: Array<RequestInterceptor & { handle: RequestHandler }> = [];
  interceptedRequests: Array<{
    requestBody: ChatCompletionStreamParams;
    matchingInterceptorName: string | undefined;
  }> = [];

  constructor(private readonly port: number, private readonly log: ToolingLog) {
    this.interval = setInterval(() => this.log.debug(`LLM proxy listening on port ${port}`), 5000);

    this.server = http
      .createServer()
      .on('request', async (request, response) => {
        const requestBody = await getRequestBody(request);

        const matchingInterceptor = this.interceptors.find(({ when }) => when(requestBody));
        this.interceptedRequests.push({
          requestBody,
          matchingInterceptorName: matchingInterceptor?.name,
        });
        if (matchingInterceptor) {
          this.log.info(`Handling interceptor "${matchingInterceptor.name}"`);
          matchingInterceptor.handle(request, response, requestBody);

          this.log.debug(`Removing interceptor "${matchingInterceptor.name}"`);
          pull(this.interceptors, matchingInterceptor);
          return;
        }

        const errorMessage = `No interceptors found to handle request: ${request.method} ${request.url}`;
        const availableInterceptorNames = this.interceptors.map(({ name }) => name);
        this.log.warning(
          `Available interceptors: ${JSON.stringify(availableInterceptorNames, null, 2)}`
        );

        this.log.warning(
          `${errorMessage}. Messages: ${JSON.stringify(requestBody.messages, null, 2)}`
        );
        response.writeHead(500, {
          'Elastic-Interceptor': 'Interceptor not found',
        });
        response.write(sseEvent({ errorMessage, availableInterceptorNames }));
        response.end();
      })
      .on('error', (error) => {
        this.log.error(`LLM proxy encountered an error: ${error}`);
      })
      .listen(port);
  }

  getPort() {
    return this.port;
  }

  clear() {
    this.interceptors = [];
    this.interceptedRequests = [];
  }

  close() {
    this.log.debug(`Closing LLM Proxy on port ${this.port}`);
    clearInterval(this.interval);
    this.server.close();
    this.clear();
  }

  waitForAllInterceptorsToHaveBeenCalled() {
    return pRetry(
      async () => {
        if (this.interceptors.length === 0) {
          return;
        }

        const unsettledInterceptors = this.interceptors.map((i) => i.name);
        this.log.debug(
          `Waiting for the following interceptors to be called: ${JSON.stringify(
            unsettledInterceptors
          )}`
        );
        if (this.interceptors.length > 0) {
          throw new Error(
            `Interceptors were not called: ${unsettledInterceptors.map((name) => `\n - ${name}`)}`
          );
        }
      },
      { retries: 5, maxTimeout: 1000 }
    ).catch((error) => {
      this.clear();
      throw error;
    });
  }

  interceptWithResponse(
    msg: string | string[],
    {
      name,
    }: {
      name?: string;
    } = {}
  ) {
    return this.intercept(
      `interceptWithResponse: "${
        name ?? isString(msg) ? msg.slice(0, 80) : `${msg.length} chunks`
      }"`,
      // @ts-expect-error
      (body) => body.tool_choice?.function?.name === undefined,
      msg
    ).completeAfterIntercept();
  }

  interceptWithFunctionRequest({
    name,
    arguments: argumentsCallback,
    when = () => true,
    interceptorName,
  }: {
    name: string;
    arguments: (body: ChatCompletionStreamParams) => string;
    when?: RequestInterceptor['when'];
    interceptorName?: string;
  }) {
    return this.intercept(
      interceptorName ?? `interceptWithFunctionRequest: "${name}"`,
      when,
      // @ts-expect-error
      (body) => {
        return {
          content: '',
          tool_calls: [
            {
              function: {
                name,
                arguments: argumentsCallback(body),
              },
              index: 0,
              id: `call_${uuidv4()}`,
            },
          ],
        };
      }
    ).completeAfterIntercept();
  }

  interceptSelectRelevantFieldsToolChoice({
    from = 0,
    to = 5,
  }: { from?: number; to?: number } = {}) {
    let relevantFields: RelevantField[] = [];
    const simulator = this.interceptWithFunctionRequest({
      name: SELECT_RELEVANT_FIELDS_NAME,
      when: (requestBody) =>
        // @ts-expect-error
        requestBody.tool_choice?.function?.name === SELECT_RELEVANT_FIELDS_NAME,
      arguments: (requestBody) => {
        const messageWithFieldIds = last(requestBody.messages);
        const matches = (messageWithFieldIds?.content as string).match(/\{[\s\S]*?\}/g)!;
        relevantFields = matches
          .slice(from, to)
          .map((jsonStr) => JSON.parse(jsonStr) as RelevantField);

        return JSON.stringify({ fieldIds: relevantFields.map(({ id }) => id) });
      },
    });

    return {
      simulator,
      getRelevantFields: async () => {
        await simulator;
        return relevantFields;
      },
    };
  }

  interceptScoreToolChoice(log: ToolingLog) {
    function extractDocumentsToScore(source: string): KnowledgeBaseDocument[] {
      const [, raw] = source.match(/<DocumentsToScore>\s*(\[[\s\S]*?\])\s*<\/DocumentsToScore>/i)!;
      const jsonString = raw.trim().replace(/\\"/g, '"');
      const documentsToScore = JSON.parse(jsonString);
      log.debug(`Extracted documents to score: ${JSON.stringify(documentsToScore, null, 2)}`);
      return documentsToScore;
    }

    let documentsToScore: KnowledgeBaseDocument[] = [];

    const simulator = this.interceptWithFunctionRequest({
      name: SCORE_SUGGESTIONS_FUNCTION_NAME,
      when: (requestBody) =>
        // @ts-expect-error
        requestBody.tool_choice?.function?.name === SCORE_SUGGESTIONS_FUNCTION_NAME,
      arguments: (requestBody) => {
        const systemMessage = first(requestBody.messages)?.content as string;
        const userMessage = last(requestBody.messages)?.content as string;
        log.debug(`interceptScoreSuggestionsToolChoice: ${userMessage}`);
        documentsToScore = extractDocumentsToScore(systemMessage);
        const scores = documentsToScore
          .map((doc: KnowledgeBaseDocument) => `${doc.id},7`)
          .join(';');

        return JSON.stringify({ scores });
      },
    });

    return {
      simulator,
      getDocumentsToScore: async () => {
        await simulator;
        return documentsToScore;
      },
    };
  }

  interceptTitle(title: string) {
    return this.interceptWithFunctionRequest({
      name: TITLE_CONVERSATION_FUNCTION_NAME,
      interceptorName: `Title: "${title}"`,
      arguments: () => JSON.stringify({ title }),
      // @ts-expect-error
      when: (body) => body.tool_choice?.function?.name === TITLE_CONVERSATION_FUNCTION_NAME,
    });
  }

  interceptQueryRewrite(rewrittenQuery: string) {
    return this.intercept(
      `interceptQueryRewrite: "${rewrittenQuery}"`,
      (body) => {
        const systemMessageContent = body.messages.find((msg) => msg.role === MessageRole.System)
          ?.content as string;
        return systemMessageContent.includes('You are a retrieval query-rewriting assistant');
      },
      rewrittenQuery
    ).completeAfterIntercept();
  }

  intercept(
    name: string,
    when: RequestInterceptor['when'],
    responseChunks?: LLMMessage | ((body: ChatCompletionStreamParams) => LLMMessage)
  ): {
    waitForIntercept: () => Promise<LlmResponseSimulator>;
    completeAfterIntercept: () => Promise<LlmResponseSimulator>;
  } {
    const waitForInterceptPromise = Promise.race([
      new Promise<LlmResponseSimulator>((outerResolve) => {
        this.interceptors.push({
          name,
          when,
          handle: (request, response, requestBody) => {
            const stream = requestBody.stream ?? false;

            function write(chunk: string) {
              return new Promise<void>((resolve) => response.write(chunk, () => resolve()));
            }
            function end() {
              return new Promise<void>((resolve) => response.end(resolve));
            }

            const simulator: LlmResponseSimulator = {
              requestBody,
              stream,
              status: once((status: number) => {
                response.writeHead(status, {
                  'Elastic-Interceptor': name.replace(/[^\x20-\x7E]/g, ' '), // Keeps only alphanumeric characters and spaces
                  'Content-Type': stream ? 'text/event-stream' : 'application/json',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                });
              }),
              next: (msg) => {
                simulator.status(200);
                const chunk = createOpenAiChunk(msg);
                return write(sseEvent(chunk));
              },
              rawWrite: (chunk: string) => {
                simulator.status(200);
                return write(chunk);
              },
              rawEnd: async () => {
                await end();
              },
              complete: async () => {
                this.log.debug(`Completed intercept for "${name}"`);
                if (stream) {
                  await write('data: [DONE]\n\n');
                }
                await end();
              },
              error: async (error) => {
                await write(
                  stream ? `data: ${JSON.stringify({ error })}\n\n` : JSON.stringify({ error })
                );
                await end();
              },
            };

            outerResolve(simulator);
          },
        });
      }),
      new Promise<LlmResponseSimulator>((_, reject) => {
        setTimeout(() => reject(new Error(`Interceptor "${name}" timed out after 30000ms`)), 30000);
      }),
    ]);

    return {
      waitForIntercept: () => waitForInterceptPromise,
      completeAfterIntercept: async () => {
        const simulator = await waitForInterceptPromise;

        function getParsedChunks(llmMessage: LLMMessage): Array<string | ToolMessage> {
          if (!llmMessage) {
            return [];
          }

          if (Array.isArray(llmMessage)) {
            return llmMessage;
          }

          if (isString(llmMessage)) {
            return llmMessage.split(' ').map((token, i) => (i === 0 ? token : ` ${token}`));
          }

          return [llmMessage];
        }

        const llmMessage = isFunction(responseChunks)
          ? responseChunks(simulator.requestBody)
          : responseChunks;

        if (simulator.stream) {
          const parsedChunks = getParsedChunks(llmMessage);
          for (const chunk of parsedChunks) {
            await simulator.next(chunk);
          }
        } else {
          await simulator.rawWrite(JSON.stringify(createOpenAIResponse(llmMessage)));
        }

        await simulator.complete();
        return simulator;
      },
    } as any;
  }
}

export async function createLlmProxy(log: ToolingLog) {
  const port = await getPort({ port: getPort.makeRange(9000, 9100) });
  log.debug(`Starting LLM Proxy on port ${port}`);
  return new LlmProxy(port, log);
}

async function getRequestBody(request: http.IncomingMessage): Promise<ChatCompletionStreamParams> {
  return new Promise((resolve, reject) => {
    let data = '';

    request.on('data', (chunk) => {
      data += chunk.toString();
    });

    request.on('close', () => {
      resolve(JSON.parse(data));
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

function sseEvent(chunk: unknown) {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}
