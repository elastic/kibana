/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { infra, timerange } from '@kbn/synthtrace-client';
import { apiTest, testData } from '../fixtures';

function generateHostsData({ from, to }: { from: string; to: string }) {
  return timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      infra
        .host('demo-stack-mysql-01')
        .overrides({ 'host.ip': '10.128.0.7' })
        .cpu()
        .timestamp(timestamp),
      infra
        .host('demo-stack-mysql-01')
        .overrides({ 'host.ip': '10.128.0.7' })
        .memory()
        .timestamp(timestamp),
      infra
        .host('demo-stack-mysql-01')
        .overrides({ 'host.ip': '10.128.0.7' })
        .network()
        .timestamp(timestamp),
    ]);
}

apiTest.describe(
  'API /api/infra/ip_to_host',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let range: { from: string; to: string };

    apiTest.beforeAll(async ({ samlAuth, infraSynthtraceEsClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      range = testData.getRecentTimerange(10);

      await infraSynthtraceEsClient.clean();
      await infraSynthtraceEsClient.index(generateHostsData(range));
    });

    apiTest.afterAll(async ({ infraSynthtraceEsClient }) => {
      await infraSynthtraceEsClient.clean();
    });

    apiTest('resolves hostname for a known IP', async ({ apiClient }) => {
      const response = await apiClient.post('api/infra/ip_to_host', {
        headers,
        responseType: 'json',
        body: {
          index_pattern: 'metrics-*',
          ip: '10.128.0.7',
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(expect.objectContaining({ host: 'demo-stack-mysql-01' }));
    });

    apiTest('returns 404 for an unknown IP', async ({ apiClient }) => {
      const response = await apiClient.post('api/infra/ip_to_host', {
        headers,
        responseType: 'json',
        body: {
          index_pattern: 'metrics-*',
          ip: '192.168.1.1',
        },
      });

      expect(response).toHaveStatusCode(404);
    });
  }
);
