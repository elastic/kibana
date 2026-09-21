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
import { apiTest, generatePodsData, generateSemconvPodsData, testData } from '../fixtures';

const ECS_POD_COUNT = 2;
const ECS_POD_UIDS = Array.from({ length: ECS_POD_COUNT }, (_, idx) => `pod-${idx}`);
const SEMCONV_CPU_WITH_LIMIT = 0.46;
const SEMCONV_CPU_WITHOUT_LIMIT = 0.32;

apiTest.describe(
  'API /api/metrics/snapshot (semconv pods)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const from = new Date(testData.SEMCONV_PODS_DATA_FROM).getTime();
    const to = new Date(testData.SEMCONV_PODS_DATA_TO).getTime();
    const semconvUids = testData.SEMCONV_PODS.map((pod) => pod.uid);
    const semconvNodeNames = [...new Set(testData.SEMCONV_PODS.map((pod) => pod.nodeName))];

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

    const lastPath = (node: SnapshotNode) => node.path[node.path.length - 1];

    apiTest.beforeAll(async ({ requestAuth, infraSynthtraceEsClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };

      await infraSynthtraceEsClient.clean();
      await infraSynthtraceEsClient.index(
        generateSemconvPodsData({
          from: testData.SEMCONV_PODS_DATA_FROM,
          to: testData.SEMCONV_PODS_DATA_TO,
          pods: testData.SEMCONV_PODS,
        })
      );
      await infraSynthtraceEsClient.index(
        generatePodsData({
          from: testData.SEMCONV_PODS_DATA_FROM,
          to: testData.SEMCONV_PODS_DATA_TO,
          count: ECS_POD_COUNT,
        })
      );
    });

    apiTest.afterAll(async ({ infraSynthtraceEsClient }) => {
      await infraSynthtraceEsClient.clean();
    });

    apiTest('returns OTel pods when schema=semconv', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'cpu' }, { type: 'rx' }, { type: 'tx' }],
          nodeType: 'pod',
          schema: 'semconv',
          groupBy: [],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      const { nodes } = snapshot;

      expect(nodes).toHaveLength(testData.SEMCONV_PODS.length);
      expect(nodes.map((node) => lastPath(node)?.value).sort()).toStrictEqual(
        [...semconvUids].sort()
      );

      for (const fixture of testData.SEMCONV_PODS) {
        const node = nodes.find((candidate) => lastPath(candidate)?.value === fixture.uid);
        if (!node) {
          throw new Error(`Expected SemConv snapshot node for uid "${fixture.uid}"`);
        }

        expect(node.name).toBe(fixture.name);
        expect(lastPath(node)?.label).toBe(fixture.name);

        const cpu = findMetric(node, 'cpu');
        expect(cpu.value).toBeCloseTo(
          fixture.withoutLimits ? SEMCONV_CPU_WITHOUT_LIMIT : SEMCONV_CPU_WITH_LIMIT,
          2
        );

        const rx = findMetric(node, 'rx').value;
        const tx = findMetric(node, 'tx').value;
        if (rx == null || tx == null) {
          throw new Error(`Expected rx/tx values for uid "${fixture.uid}"`);
        }
        expect(rx).toBeGreaterThan(0);
        expect(tx).toBeGreaterThan(0);
      }
    });

    apiTest('returns only ECS pods when schema is omitted on mixed data', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'cpu' }],
          nodeType: 'pod',
          groupBy: [],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      const uids = snapshot.nodes.map((node) => lastPath(node)?.value);

      expect(snapshot.nodes).toHaveLength(ECS_POD_COUNT);
      expect(uids.sort()).toStrictEqual([...ECS_POD_UIDS].sort());
      expect(uids.some((uid) => semconvUids.includes(uid ?? ''))).toBe(false);
    });

    apiTest('returns only ECS pods when schema=ecs on mixed data', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'cpu' }],
          nodeType: 'pod',
          schema: 'ecs',
          groupBy: [],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      const { nodes } = snapshot;
      const uids = nodes.map((node) => lastPath(node)?.value);

      expect(nodes).toHaveLength(ECS_POD_COUNT);
      expect(uids.sort()).toStrictEqual([...ECS_POD_UIDS].sort());
      expect(uids.some((uid) => semconvUids.includes(uid ?? ''))).toBe(false);
    });

    apiTest('groups SemConv pods by k8s.node.name', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'cpu' }],
          nodeType: 'pod',
          schema: 'semconv',
          groupBy: [{ field: 'k8s.node.name' }],
          includeTimeseries: false,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;
      const { nodes } = snapshot;

      expect(nodes).toHaveLength(testData.SEMCONV_PODS.length);
      for (const node of nodes) {
        expect(node.path).toHaveLength(2);
        expect(semconvNodeNames).toContain(node.path[0]?.value);
        expect(semconvUids).toContain(lastPath(node)?.value);
      }
    });

    apiTest('includes timeseries rows for SemConv pod cpu', async ({ apiClient }) => {
      const response = await apiClient.post('api/metrics/snapshot', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          timerange: { from, to, interval: '1m' },
          metrics: [{ type: 'cpu' }],
          nodeType: 'pod',
          schema: 'semconv',
          groupBy: [],
          includeTimeseries: true,
        },
      });

      expect(response).toHaveStatusCode(200);
      const snapshot = response.body as SnapshotNodeResponse;

      expect(snapshot.nodes.length).toBeGreaterThan(0);
      for (const node of snapshot.nodes) {
        const cpu = findMetric(node, 'cpu');
        expect(cpu.timeseries?.rows.length).toBeGreaterThan(0);
      }
    });
  }
);
