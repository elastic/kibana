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

type RequestHandler = (
  request: http.IncomingMessage,
  response: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage }
) => void;

type RequestFilterFunction = ({}: {
  request: http.IncomingMessage;
  data: string;
}) => Promise<boolean>;

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
  error: (error: Error) => Promise<void>;
  complete: () => Promise<void>;
  write: (chunk: string) => Promise<void>;
}

export class LlmProxy {
  server: Server;

  requestHandlers: Array<{
    filter?: RequestFilterFunction;
    handler: RequestHandler;
  }> = [];

  constructor(private readonly port: number) {
    this.server = http
      .createServer(async (request, response) => {
        const handlers = this.requestHandlers.concat();
        for (let i = 0; i < handlers.length; i++) {
          const handler = handlers[i];
          let data: string = '';
          await new Promise<void>((resolve, reject) => {
            request.on('data', (chunk) => {
              data += chunk.toString();
            });
            request.on('close', () => {
              resolve();
            });
          });
          if (!handler.filter || (await handler.filter({ data, request }))) {
            pull(this.requestHandlers, handler);
            handler.handler(request, response);
            return;
          }
        }
      })
      .listen(port);
  }

  getPort() {
    return this.port;
  }

  close() {
    this.server.close();
  }

  respond<T>(
    cb: (simulator: LlmResponseSimulator) => Promise<T>,
    filter?: RequestFilterFunction
  ): Promise<T> {
    return Promise.race([
      new Promise<T>((outerPromiseResolve, outerPromiseReject) => {
        const requestHandlerPromise = new Promise<Parameters<RequestHandler>>((resolve) => {
          this.requestHandlers.push({
            filter,
            handler: (request, response) => {
              resolve([request, response]);
            },
          });
        });

        function write(chunk: string) {
          return withResponse(
            (response) => new Promise<void>((resolve) => response.write(chunk, () => resolve()))
          );
        }
        function end() {
          return withResponse((response) => {
            return new Promise<void>((resolve) => response.end(resolve));
          });
        }

        function withResponse(responseCb: (response: Parameters<RequestHandler>[1]) => void) {
          return requestHandlerPromise.then(([request, response]) => {
            return responseCb(response);
          });
        }

        cb({
          status: once((status: number) => {
            return withResponse((response) => {
              response.writeHead(status, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              });
            });
          }),
          next: (msg) => {
            const chunk = createOpenAiChunk(msg);
            return write(`data: ${JSON.stringify(chunk)}\n`);
          },
          write: (chunk: string) => {
            return write(chunk);
          },
          complete: async () => {
            await write('data: [DONE]');
            await end();
          },
          error: async (error) => {
            await write(`data: ${JSON.stringify({ error })}`);
            await end();
          },
        })
          .then((result) => {
            outerPromiseResolve(result);
          })
          .catch((err) => {
            outerPromiseReject(err);
          });
      }),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 5000);
      }),
    ]);
  }
}

export async function createLlmProxy() {
  const port = await getPort({ port: getPort.makeRange(9000, 9100) });

  return new LlmProxy(port);
}
