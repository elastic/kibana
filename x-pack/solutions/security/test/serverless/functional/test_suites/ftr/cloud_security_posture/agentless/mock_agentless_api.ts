/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as http from 'http';

export const setupMockServer = () => {
  const deployments = new Map<string, { policy_id: string; revision_idx: number }>();
  const endpoint = '/api/v1/serverless/deployments';
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (req.method === 'POST' && pathname === endpoint) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const { policy_id: policyId } = JSON.parse(Buffer.concat(chunks).toString()) as {
        policy_id?: string;
      };
      if (policyId) deployments.set(policyId, { policy_id: policyId, revision_idx: 1 });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 200 }));
      return;
    }

    if (req.method === 'GET' && pathname === endpoint) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ deployments: [...deployments.values()] }));
      return;
    }

    // Default 404 response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
};
