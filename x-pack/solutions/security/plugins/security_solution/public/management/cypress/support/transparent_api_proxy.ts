/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import http, { type IncomingMessage, type ServerResponse } from 'http';
// eslint-disable-next-line import/no-nodejs-modules
import https from 'https';
import { ES_CERT_PATH, ES_KEY_PATH } from '@kbn/dev-utils';
import type { UsageRecord } from '@kbn/security-solution-serverless/server/types';
import { setupStackServicesUsingCypressConfig } from './common';
import { type StartTransparentApiProxyOptions } from '../tasks/transparent_api_proxy';

export const transparentApiProxy = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  let proxy: { start: (port: number) => Promise<void>; stop: () => Promise<void> } | null = null;
  const interceptedRequestBody: UsageRecord[][] = [];

  on('task', {
    startTransparentApiProxy: async (options: StartTransparentApiProxyOptions) => {
      const { log } = await setupStackServicesUsingCypressConfig(config);

      const port = options?.port || 3623;

      log.debug(`[Transparent API] Starting transparent API proxy on port ${port}`);

      try {
        const httpsOptions = options?.useCert
          ? {
              key: fs.readFileSync(ES_KEY_PATH),
              cert: fs.readFileSync(ES_CERT_PATH),
            }
          : undefined;

        const handler = (req: IncomingMessage, res: ServerResponse) => {
          let body = '';

          req.on('data', (chunk: string) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsedBody = JSON.parse(body);
              interceptedRequestBody.push(parsedBody);
              log.debug(`[Transparent API] received ${parsedBody.length} items.`);
            } catch (err) {
              throw new Error(`[Transparent API] Failed to parse request body as JSON: ${err}`);
            }
            res.writeHead(201);
            res.end();
          });
        };

        const server = httpsOptions
          ? https.createServer(httpsOptions, handler)
          : http.createServer(handler);

        proxy = {
          start: (listenPort: number) =>
            new Promise<void>((resolve, reject) => {
              server.once('error', reject);
              server.listen(listenPort, () => resolve());
            }),
          stop: () =>
            new Promise<void>((resolve, reject) => {
              server.close((err) => (err ? reject(err) : resolve()));
            }),
        };
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
