/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from '@mswjs/http-middleware';

import { http, HttpResponse, StrictResponse } from 'msw';

export const setupMockServer = () => {
  const server = createServer(deploymentHandler);
  return server;
};

interface AgentlessApiResponse {
  status: number;
}

const deploymentHandler = http.post(
  'api/v1/serverless/deployments',
  async ({ request }): Promise<StrictResponse<AgentlessApiResponse>> => {
    return HttpResponse.json({
      status: 200,
    });
  }
);
