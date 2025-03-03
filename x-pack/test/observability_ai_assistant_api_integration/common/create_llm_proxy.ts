/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import getPort from 'get-port';
import { v4 as uuidv4 } from 'uuid';
import http, { type Server } from 'http';
import { isString, once, pull, isFunction } from 'lodash';
import { TITLE_CONVERSATION_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/service/client/operators/get_generated_title';
import pRetry from 'p-retry';
import type { ChatCompletionChunkToolCall } from '@kbn/inference-common';
import { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { createOpenAiChunk } from './create_openai_chunk';

type Request = http.IncomingMessage;
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };

type LLMMessage = string[] | ToolMessage | string | undefined;

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
export interface LlmResponseSimulator {
  requestBody: ChatCompletionStreamParams;
  status: (code: number) => void;
  next: (msg: string | ToolMessage) => Promise<void>;
  error: (error: any) => Promise<void>;
  complete: () => Promise<void>;
  rawWrite: (chunk: string) => Promise<void>;
  rawEnd: () => Promise<void>;
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
        this.log.error(
          `Available interceptors: ${JSON.stringify(availableInterceptorNames, null, 2)}`
        );

        this.log.error(
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
          throw new Error(`Interceptors were not called: ${unsettledInterceptors}`);
        }
      },
      { retries: 5, maxTimeout: 1000 }
    ).catch((error) => {
      this.clear();
      throw error;
    });
  }

  interceptConversation(
    msg: LLMMessage,
    {
      name,
    }: {
      name?: string;
    } = {}
  ) {
    return this.intercept(
      `Conversation interceptor: "${name ?? 'Unnamed'}"`,
      // @ts-expect-error
      (body) => body.tool_choice?.function?.name === undefined,
      msg
    ).completeAfterIntercept();
  }

  interceptWithFunctionRequest({
    name: name,
    arguments: argumentsCallback,
    when,
  }: {
    name: string;
    arguments: (body: ChatCompletionStreamParams) => string;
    when: RequestInterceptor['when'];
  }) {
    // @ts-expect-error
    return this.intercept(`Function request interceptor: "${name}"`, when, (body) => {
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
    }).completeAfterIntercept();
  }

  interceptTitle(title: string) {
    return this.interceptWithFunctionRequest({
      name: TITLE_CONVERSATION_FUNCTION_NAME,
      arguments: () => JSON.stringify({ title }),
      // @ts-expect-error
      when: (body) => body.tool_choice?.function?.name === TITLE_CONVERSATION_FUNCTION_NAME,
    });
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
            function write(chunk: string) {
              return new Promise<void>((resolve) => response.write(chunk, () => resolve()));
            }
            function end() {
              return new Promise<void>((resolve) => response.end(resolve));
            }

            const simulator: LlmResponseSimulator = {
              requestBody,
              status: once((status: number) => {
                response.writeHead(status, {
                  'Elastic-Interceptor': name,
                  'Content-Type': 'text/event-stream',
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
                await write('data: [DONE]\n\n');
                await end();
              },
              error: async (error) => {
                await write(`data: ${JSON.stringify({ error })}\n\n`);
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

        function getParsedChunks(): Array<string | ToolMessage> {
          const llmMessage = isFunction(responseChunks)
            ? responseChunks(simulator.requestBody)
            : responseChunks;

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

        const parsedChunks = getParsedChunks();
        for (const chunk of parsedChunks) {
          await simulator.next(chunk);
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
