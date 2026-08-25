/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { ProcessListAPIRequest } from '../../../../common/http_api/host_details/process_list';
import { ProcessListAPIResponseRT } from '../../../../common/http_api/host_details/process_list';
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

    apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.METRICS_HOSTS_PROCESSES_8_0_0);
    });

    apiTest('returns process list and summary for an ECS host', async ({ apiClient }) => {
      const body: ProcessListAPIRequest = {
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
      };

      const response = await apiClient.post('api/metrics/process_list', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);

      const { processList, summary } = decodeOrThrow(ProcessListAPIResponseRT)(response.body);
      expect(processList).toHaveLength(10);
      expect(summary.total).toBe(313);
    });
  }
);
