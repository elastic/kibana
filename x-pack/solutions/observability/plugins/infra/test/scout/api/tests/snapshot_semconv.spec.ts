/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type {
  SnapshotNode,
  SnapshotNodeMetric,
  SnapshotNodeResponse,
} from '../../../../common/http_api/snapshot_api';
import { apiTest, testData, generateSemconvHostsData } from '../fixtures';

apiTest.describe(
  'API /api/metrics/snapshot (semconv)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const from = new Date(testData.SEMCONV_HOSTS_DATA_FROM).getTime();
    const to = new Date(testData.SEMCONV_HOSTS_DATA_TO).getTime();

    const findMetric = (node: SnapshotNode, name: string): SnapshotNodeMetric => {
      const metric = node.metrics.find((m) => m.name === name);
      if (!metric) {
        throw new Error(
          `Expected node "${node.path[0]?.value}" to expose metric "${name}", got: ${node.metrics
            .map((m) => m.name)
            .join(', ')}`
        );
      }
      return metric;
    };

    apiTest.beforeAll(async ({ requestAuth, infraSynthtraceEsClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };

      await infraSynthtraceEsClient.clean();
      await infraSynthtraceEsClient.index(
        generateSemconvHostsData({
          from: testData.SEMCONV_HOSTS_DATA_FROM,
          to: testData.SEMCONV_HOSTS_DATA_TO,
          hosts: testData.SEMCONV_HOSTS,
        })
      );
    });

    apiTest.afterAll(async ({ infraSynthtraceEsClient }) => {
      await infraSynthtraceEsClient.clean();
    });

    apiTest('returns OTel hosts when schema=semconv (cpu)', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'cpuV2' }],
          nodeType: 'host',
          schema: 'semconv',
          groupBy: [],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      const { nodes } = snapshot;

      const nodeNames = nodes.map((n) => n.path[0]?.value).sort();
      expect(nodeNames).toStrictEqual(testData.SEMCONV_HOSTS.map((h) => h.hostName).sort());

      const cpu = findMetric(nodes[0], 'cpuV2');
      // OTel cpu utilization is non-null because semconvHost emits state-based docs.
      expect(typeof cpu.avg).toBe('number');
    });

    apiTest('returns OTel hosts when schema=semconv (memory)', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'memory' }],
          nodeType: 'host',
          schema: 'semconv',
          groupBy: [],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      const { nodes } = snapshot;

      const nodeNames = nodes.map((n) => n.path[0]?.value).sort();
      expect(nodeNames).toStrictEqual(testData.SEMCONV_HOSTS.map((h) => h.hostName).sort());

      const memory = findMetric(nodes[0], 'memory');
      expect(typeof memory.avg).toBe('number');
    });
  }
);
