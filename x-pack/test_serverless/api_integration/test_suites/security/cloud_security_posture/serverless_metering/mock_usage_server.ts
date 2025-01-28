/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from '@mswjs/http-middleware';

import { http, HttpResponse, StrictResponse } from 'msw';

export const setupMockServer = () => {
  const server = createServer(usageAPIHandler);

  return server;
};
export interface UsageRecord {
  id: string;
  usage_timestamp: string;
  creation_timestamp: string;
  usage: UsageMetrics;
  source: UsageSource;
}

export interface UsageMetrics {
  type: string;
  sub_type?: string;
  quantity: number;
  period_seconds?: number;
  cause?: string;
  metadata?: unknown;
}

export interface UsageSource {
  id: string;
  instance_group_id: string;
  metadata?: UsageSourceMetadata;
}

export interface UsageSourceMetadata {
  tier?: string;
}

interface UsageResponse {
  response: UsageRecord[];
}

let interceptedRequestPayload: UsageRecord[] = [];

const usageAPIHandler = http.post(
  'api/v1/usage',
  async ({ request }): Promise<StrictResponse<UsageResponse>> => {
    const payload = (await request.clone().json()) as UsageRecord[];
    interceptedRequestPayload = payload;

    return HttpResponse.json({
      response: payload,
    });
  }
);

export const getInterceptedRequestPayload = (): UsageRecord[] => interceptedRequestPayload;
