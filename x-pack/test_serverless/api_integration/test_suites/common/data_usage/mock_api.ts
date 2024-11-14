/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from '@mswjs/http-middleware';
import { UsageMetricsAutoOpsResponseSchemaBody } from '@kbn/data-usage-plugin/common/rest_types';
import { http, HttpResponse, StrictResponse } from 'msw';

export const setupMockServer = () => {
  const server = createServer(autoOpsHandler);
  return server;
};

export interface AutoOpsRequestBody {
  metricTypes: string[];
  dataStreams: string[];
}

const autoOpsHandler = http.post(
  '/',
  async ({ request }): Promise<StrictResponse<UsageMetricsAutoOpsResponseSchemaBody>> => {
    const body = (await request.json()) as AutoOpsRequestBody;
    const { metricTypes, dataStreams } = body;

    // Helper function to generate sample data
    const generateSampleData = (): Array<[number, number]> => [
      [Date.now() - 3600 * 1000, Math.floor(Math.random() * 10000000)], // Pair of numbers
      [Date.now(), Math.floor(Math.random() * 10000000)], // Pair of numbers
    ];

    // Build response based on requested metricTypes and dataStreams
    const response: UsageMetricsAutoOpsResponseSchemaBody = {
      metrics: metricTypes.reduce((acc, metricType) => {
        acc[metricType] = dataStreams.map((dataStream) => ({
          name: dataStream,
          data: generateSampleData(),
        }));
        return acc;
      }, {} as Record<string, Array<{ name: string; data: Array<[number, number]> }>>),
    };

    return HttpResponse.json(response);
  }
);
