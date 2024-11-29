/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import getPort from 'get-port';
import http, { type Server } from 'http';
import { once, pull } from 'lodash';
import OpenAI from 'openai';
import { TITLE_CONVERSATION_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/service/client/operators/get_generated_title';
import { createOpenAiChunk } from './create_openai_chunk';

type Request = http.IncomingMessage;
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };

type RequestHandler = (
  request: Request,
  response: Response,
  body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
) => void;

interface RequestInterceptor {
  name: string;
  when: (body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) => boolean;
}

export interface LlmResponseSimulator {
  body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
  status: (code: number) => Promise<void>;
  next: (
    msg:
      | string
      | {
          content?: string;
          function_call?: { name: string; arguments: string };
        }
  ) => Promise<void>;
  error: (error: any) => Promise<void>;
  complete: () => Promise<void>;
  rawWrite: (chunk: string) => Promise<void>;
  rawEnd: () => Promise<void>;
}

export class LlmProxy {
  server: Server;
  interval: NodeJS.Timeout;

  interceptors: Array<RequestInterceptor & { handle: RequestHandler }> = [];

  constructor(private readonly port: number, private readonly log: ToolingLog) {
    this.interval = setInterval(() => this.log.debug(`LLM proxy listening on port ${port}`), 1000);

    this.server = http
      .createServer()
      .on('request', async (request, response) => {
        this.log.info(`LLM request received`);

        const interceptors = this.interceptors.concat();
        const body = await getRequestBody(request);

        while (interceptors.length) {
          const interceptor = interceptors.shift()!;

          if (interceptor.when(body)) {
            pull(this.interceptors, interceptor);
            interceptor.handle(request, response, body);
            return;
          }
        }

        const errorMessage = `No interceptors found to handle request: ${request.method} ${request.url}`;
        this.log.error(`${errorMessage}. Messages: ${JSON.stringify(body.messages, null, 2)}`);
        response.writeHead(500, { errorMessage, messages: JSON.stringify(body.messages) });
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
    this.interceptors.length = 0;
  }

  close() {
    this.log.debug(`Closing LLM Proxy on port ${this.port}`);
    clearInterval(this.interval);
    this.server.close();
  }

  waitForAllInterceptorsSettled() {
    return Promise.all(this.interceptors);
  }

  interceptConversation({
    name = 'default_interceptor_conversation_name',
    response,
  }: {
    name?: string;
    response: string;
  }) {
    return this.intercept(name, (body) => !isFunctionTitleRequest(body), response);
  }

  interceptConversationTitle(title: string) {
    return this.intercept('conversation_title', (body) => isFunctionTitleRequest(body), [
      {
        function_call: {
          name: TITLE_CONVERSATION_FUNCTION_NAME,
          arguments: JSON.stringify({ title }),
        },
      },
    ]);
  }

  intercept<
    TResponseChunks extends Array<Record<string, unknown>> | string | undefined = undefined
  >(
    name: string,
    when: RequestInterceptor['when'],
    responseChunks?: TResponseChunks
  ): TResponseChunks extends undefined
    ? {
        waitForIntercept: () => Promise<LlmResponseSimulator>;
      }
    : {
        completeAfterIntercept: () => Promise<void>;
      } {
    const waitForInterceptPromise = Promise.race([
      new Promise<LlmResponseSimulator>((outerResolve) => {
        this.interceptors.push({
          name,
          when,
          handle: (request, response, body) => {
            this.log.info(`LLM request intercepted by "${name}"`);

            function write(chunk: string) {
              return new Promise<void>((resolve) => response.write(chunk, () => resolve()));
            }
            function end() {
              return new Promise<void>((resolve) => response.end(resolve));
            }

            const simulator: LlmResponseSimulator = {
              body,
              status: once(async (status: number) => {
                response.writeHead(status, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                });
              }),
              next: (msg) => {
                const chunk = createOpenAiChunk(msg);
                return write(`data: ${JSON.stringify(chunk)}\n\n`);
              },
              rawWrite: (chunk: string) => {
                return write(chunk);
              },
              rawEnd: async () => {
                await end();
              },
              complete: async () => {
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
        setTimeout(() => reject(new Error(`Interceptor "${name}" timed out after 20000ms`)), 20000);
      }),
    ]);

    if (responseChunks === undefined) {
      return { waitForIntercept: () => waitForInterceptPromise } as any;
    }

    const parsedChunks = Array.isArray(responseChunks)
      ? responseChunks
      : responseChunks.split(' ').map((token, i) => (i === 0 ? token : ` ${token}`));

    return {
      completeAfterIntercept: async () => {
        const simulator = await waitForInterceptPromise;
        for (const chunk of parsedChunks) {
          await simulator.next(chunk);
        }
        await simulator.complete();
      },
    } as any;
  }
}

export async function createLlmProxy(log: ToolingLog) {
  const port = await getPort({ port: getPort.makeRange(9000, 9100) });
  log.debug(`Starting LLM Proxy on port ${port}`);
  return new LlmProxy(port, log);
}

async function getRequestBody(
  request: http.IncomingMessage
): Promise<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming> {
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

export function isFunctionTitleRequest(body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) {
  return (
    body.tools?.find((fn) => fn.function.name === TITLE_CONVERSATION_FUNCTION_NAME) !== undefined
  );
}
