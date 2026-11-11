/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

export interface TargetServer {
  server: http.Server;
  port: number;
  url: string;
  host: string;
}

export async function startTargetServer(): Promise<TargetServer> {
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/fail')) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('fail');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<html><body><h1>scout-synthetics-agent-e2e</h1></body></html>');
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '0.0.0.0', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind the local target HTTP server');
  }

  const { port } = address;
  return {
    server,
    port,
    url: `http://host.docker.internal:${port}`,
    host: `host.docker.internal:${port}`,
  };
}

export async function stopTargetServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
