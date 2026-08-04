/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { ProcessListAPIChartRequest } from '../../../../common/http_api/host_details/process_list';
import { ProcessListAPIChartResponseRT } from '../../../../common/http_api/host_details/process_list';
import { apiTest, testData } from '../fixtures';

/** Semconv coverage gap: see metrics_process_list.spec.ts / issue #264011. */
apiTest.describe(
  'API /api/metrics/process_list/chart',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.METRICS_HOSTS_PROCESSES_8_0_0);
    });

    apiTest('returns CPU and memory chart series for a process', async ({ apiClient }) => {
      const body: ProcessListAPIChartRequest = {
        hostTerm: {
          'host.name': 'gke-observability-8--observability-8--bc1afd95-nhhw',
        },
        indexPattern: 'metrics-*,metricbeat-*',
        to: testData.PROCESS_LIST_TO,
        command:
          '/System/Library/CoreServices/NotificationCenter.app/Contents/MacOS/NotificationCenter',
        schema: 'ecs',
      };

      const response = await apiClient.post('api/metrics/process_list/chart', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);

      const { cpu, memory } = decodeOrThrow(ProcessListAPIChartResponseRT)(response.body);
      expect(cpu.rows).toHaveLength(16);
      expect(memory.rows).toHaveLength(16);
    });
  }
);
