/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UsageMetricsAutoOpsResponseSchemaBody } from '@kbn/data-usage-plugin/common/rest_types';
import { ToolingLog } from '@kbn/tooling-log';
import http from 'http';

export function createProxyServer(port: number, log: ToolingLog): http.Server {
  const server = http.createServer((req, res) => {
    log.debug(`Received request: ${req.method} ${req.url}`);

    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      log.debug(`Request body: ${body}`);

      // interception logic here
      if (req.method === 'POST' && req.url === '/') {
        // TODO: decide on how to generate data
        const response: UsageMetricsAutoOpsResponseSchemaBody = {
          metrics: {
            ingest_rate: [
              {
                name: 'metrics-system.cpu-default',
                data: [
                  [1726858530000, 13756849],
                  [1726862130000, 14657904],
                ],
              },
              {
                name: 'logs-nginx.access-default',
                data: [
                  [1726858530000, 12894623],
                  [1726862130000, 14436905],
                ],
              },
            ],
            storage_retained: [
              {
                name: 'metrics-system.cpu-default',
                data: [
                  [1726858530000, 12576413],
                  [1726862130000, 13956423],
                ],
              },
              {
                name: 'logs-nginx.access-default',
                data: [
                  [1726858530000, 12894623],
                  [1726862130000, 14436905],
                ],
              },
            ],
          },
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
  });

  server.listen(port, () => {
    log.debug(`Proxy server is listening on port ${port}`);
  });

  return server;
}
