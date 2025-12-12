/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as http from 'http';

export const setupMockAgentlessServer = () => {
  const server = http.createServer((req, res) => {
    // eslint-disable-next-line no-console
    console.log(`[Mock Agentless API] ${req.method} ${req.url}`);

    // Handle POST /api/v1/ess/deployments
    if (req.method === 'POST' && req.url === '/api/v1/ess/deployments') {
      // eslint-disable-next-line no-console
      console.log('[Mock Agentless API] ✅ Handling POST /api/v1/ess/deployments');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }

    // Handle GET /api/v1/ess/deployments
    if (req.method === 'GET' && req.url?.startsWith('/api/v1/ess/deployments')) {
      // eslint-disable-next-line no-console
      console.log('[Mock Agentless API] ✅ Handling GET /api/v1/ess/deployments');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ deployments: [] }));
      return;
    }

    // Handle DELETE /api/v1/ess/deployments/:id
    if (req.method === 'DELETE' && req.url?.startsWith('/api/v1/ess/deployments/')) {
      // eslint-disable-next-line no-console
      console.log(`[Mock Agentless API] ✅ Handling DELETE ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }

    // Handle PUT /api/v1/ess/deployments/:id (update/upgrade)
    if (req.method === 'PUT' && req.url?.startsWith('/api/v1/ess/deployments/')) {
      // eslint-disable-next-line no-console
      console.log(`[Mock Agentless API] ✅ Handling PUT ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }

    // Handle serverless endpoints if needed
    if (req.method === 'POST' && req.url === '/api/v1/serverless/deployments') {
      // eslint-disable-next-line no-console
      console.log('[Mock Agentless API] ✅ Handling POST /api/v1/serverless/deployments');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }

    // Default 404 response
    // eslint-disable-next-line no-console
    console.log(`[Mock Agentless API] ❌ 404 Not Found: ${req.method} ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
};
