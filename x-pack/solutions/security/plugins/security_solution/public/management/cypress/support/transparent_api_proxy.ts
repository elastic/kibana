/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import type { IncomingMessage, ServerResponse } from 'http';
import DebugProxy from '@cypress/debugging-proxy';
import { ES_CERT_PATH, ES_KEY_PATH } from '@kbn/dev-utils';
import type { UsageRecord } from '@kbn/security-solution-serverless/server/types';
import { setupStackServicesUsingCypressConfig } from './common';

export const transparentApiProxy = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  let proxy: { start: (port: number) => Promise<void>; stop: () => Promise<void> } | null = null;
  const interceptedRequestBody: UsageRecord[][] = [];

  on('task', {
    startTransparentApiProxy: async (options) => {
      const { log } = await setupStackServicesUsingCypressConfig(config);

      const port = options?.port || 3623;

      log.debug(`[Transparent API] Starting transparent API proxy on port ${port}`);

      try {
        proxy = new DebugProxy({
          keepRequests: true,
          https: {
            key: fs.readFileSync(ES_KEY_PATH),
            cert: fs.readFileSync(ES_CERT_PATH),
          },
          onRequest: (_: string, req: IncomingMessage, res: ServerResponse) => {
            let body = '';

            req.on('data', (chunk: string) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsedBody = JSON.parse(body);
                interceptedRequestBody.push(parsedBody);
              } catch (err) {
                throw new Error(`[Transparent API] Failed to parse request body as JSON: ${err}`);
              }
              res.writeHead(201);
              res.end();
            });
          },
        });
      } catch (e) {
        log.error(`[Transparent API] Error starting transparent API proxy: ${e}`);
        throw e;
      }
      if (!proxy) {
        throw new Error('[Transparent API] Proxy was not initialized');
      }

      await proxy.start(port);
      log.debug(`[Transparent API] proxy started on port ${port}`);
      return null;
    },
    getInterceptedRequestsFromTransparentApiProxy: async (): Promise<UsageRecord[][]> => {
      return interceptedRequestBody;
    },
    stopTransparentProxyApi: async () => {
      if (proxy) {
        await proxy.stop();
      }
      return null;
    },
  });
};
