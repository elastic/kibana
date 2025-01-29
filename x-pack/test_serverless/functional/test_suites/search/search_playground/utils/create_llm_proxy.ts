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
import { createOpenAiChunk } from './create_openai_chunk';

type Request = http.IncomingMessage;
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };

type RequestHandler = (request: Request, response: Response, body: string) => void;

interface RequestInterceptor {
  name: string;
  when: (body: string) => boolean;
}

export interface LlmResponseSimulator {
  body: string;
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

  interceptors: Array<RequestInterceptor & { handle: RequestHandler }> = [];

  constructor(private readonly port: number, private readonly log: ToolingLog) {
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

        response.writeHead(500, 'No interceptors found to handle request: ' + request.url);
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
    this.server.close();
  }

  waitForAllInterceptorsSettled() {
    return Promise.all(this.interceptors);
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
        complete: () => Promise<void>;
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
        setTimeout(() => reject(new Error(`Interceptor "${name}" timed out after 5000ms`)), 5000);
      }),
    ]);

    if (responseChunks === undefined) {
      return { waitForIntercept: () => waitForInterceptPromise } as any;
    }

    const parsedChunks = Array.isArray(responseChunks)
      ? responseChunks
      : responseChunks.split(' ').map((token, i) => (i === 0 ? token : ` ${token}`));

    return {
      complete: async () => {
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

  return new LlmProxy(port, log);
}

async function getRequestBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';

    request.on('data', (chunk) => {
      data += chunk.toString();
    });

    request.on('close', () => {
      resolve(data);
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}
