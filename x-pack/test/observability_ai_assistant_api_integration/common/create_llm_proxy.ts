/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import getPort from 'get-port';
import http, { type Server } from 'http';
import { once, pull } from 'lodash';
import { createOpenAiChunk } from './create_openai_chunk';

type Request = http.IncomingMessage;
type Response = http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage };

type RequestHandler = (request: Request, response: Response) => void;

interface RequestInterceptor {
  name: string;
  when: (body: string) => boolean;
}

export interface LlmResponseSimulator {
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

  constructor(private readonly port: number) {
    this.server = http
      .createServer(async (request, response) => {
        const interceptors = this.interceptors.concat();

        const body = await new Promise<string>((resolve, reject) => {
          let concatenated = '';
          request.on('data', (chunk) => {
            concatenated += chunk.toString();
          });
          request.on('close', () => {
            resolve(concatenated);
          });
        });

        while (interceptors.length) {
          const interceptor = interceptors.shift()!;
          if (interceptor.when(body)) {
            pull(this.interceptors, interceptor);
            interceptor.handle(request, response);
            return;
          }
        }

        response.writeHead(500, 'No interceptors found to handle request: ' + request.url);
        response.end();
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

  intercept(
    name: string,
    when: RequestInterceptor['when']
  ): {
    waitForIntercept: () => Promise<LlmResponseSimulator>;
  } {
    const waitForInterceptPromise = Promise.race([
      new Promise<LlmResponseSimulator>((outerResolve, outerReject) => {
        this.interceptors.push({
          name,
          when,
          handle: (request, response) => {
            function write(chunk: string) {
              return new Promise<void>((resolve) => response.write(chunk, () => resolve()));
            }
            function end() {
              return new Promise<void>((resolve) => response.end(resolve));
            }

            const simulator: LlmResponseSimulator = {
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
        setTimeout(() => reject(new Error('Operation timed out')), 5000);
      }),
    ]);

    return {
      waitForIntercept: () => waitForInterceptPromise,
    };
  }
}

export async function createLlmProxy() {
  const port = await getPort({ port: getPort.makeRange(9000, 9100) });

  return new LlmProxy(port);
}
