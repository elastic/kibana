#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Test script to manually start the mock agentless API server
const { setupMockAgentlessServer } = require('./mock_agentless_api.ts');

const server = setupMockAgentlessServer();

server.listen(8089, () => {
  console.log('✅ Mock Agentless API server is running on http://localhost:8089');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
  console.log('Test it with:');
  console.log('  curl -X POST http://localhost:8089/api/v1/ess/deployments');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping mock server...');
  server.close(() => {
    console.log('✅ Mock server stopped');
    process.exit(0);
  });
});

