/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../fixtures';

/**
 * Semconv coverage gap: `infra.semconvHost(...)` does not yet emit OTel process
 * docs. The route accepts `schema: 'semconv'`, but meaningful coverage needs
 * synthtrace/process archive work (issue #264011). ECS remains canonical until then.
 */
apiTest.describe(
  'API /api/metrics/process_list',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.METRICS_HOSTS_PROCESSES_8_0);
    });

    apiTest('returns process list and summary for an ECS host', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/process_list', {
        headers,
        responseType: 'json',
        body: {
          hostTerm: {
            'host.name': 'gke-observability-8--observability-8--bc1afd95-nhhw',
          },
          sourceId: 'default',
          to: testData.PROCESS_LIST_TO,
          sortBy: {
            name: 'cpu',
            isAscending: false,
          },
          searchFilter: [{ match_all: {} }],
          schema: 'ecs',
        },
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as {
        processList: unknown[];
        summary: { total: number };
      };
      expect(body.processList).toHaveLength(10);
      expect(body.summary.total).toBe(313);
    });
  }
);
