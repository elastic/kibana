/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { InfraMetadata } from '../../../../common/http_api/metadata_api';
import {
  apiTest,
  generatePodsData,
  generateSemconvHostsData,
  generateSemconvPodsData,
  testData,
} from '../fixtures';

const POD = testData.SEMCONV_PODS[0];
const ECS_POD_UID = 'pod-0';

apiTest.describe(
  'API /api/infra/metadata (semconv pods)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const timeRange = {
      from: new Date(testData.SEMCONV_PODS_DATA_FROM).getTime(),
      to: new Date(testData.SEMCONV_PODS_DATA_TO).getTime(),
    };

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
        generateSemconvHostsData({
          from: testData.SEMCONV_PODS_DATA_FROM,
          to: testData.SEMCONV_PODS_DATA_TO,
          hosts: [{ hostName: 'semconv-host-1' }, { hostName: 'semconv-host-2' }],
        })
      );
      await infraSynthtraceEsClient.index(
        generatePodsData({
          from: testData.SEMCONV_PODS_DATA_FROM,
          to: testData.SEMCONV_PODS_DATA_TO,
          count: 1,
        })
      );
    });

    apiTest.afterAll(async ({ infraSynthtraceEsClient }) => {
      await infraSynthtraceEsClient.clean();
    });

    apiTest('returns kubeletstats metadata for an OpenTelemetry pod', async ({ apiClient }) => {
      const response = await apiClient.post('api/infra/metadata', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          nodeId: POD.uid,
          nodeType: 'pod',
          schema: 'semconv',
          timeRange,
        },
      });

      expect(response).toHaveStatusCode(200);
      const metadata = response.body as InfraMetadata;
      expect(metadata.name).toBe(POD.name);
      expect(metadata.features?.map((feature) => feature.name)).toContain(
        'kubeletstatsreceiver.otel'
      );
      expect(metadata.info?.host?.name).toBe(POD.nodeName);
    });

    apiTest(
      'does not treat an OpenTelemetry pod as Elastic Common Schema',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/infra/metadata', {
          headers,
          responseType: 'json',
          body: {
            sourceId: 'default',
            nodeId: POD.uid,
            nodeType: 'pod',
            timeRange,
          },
        });

        expect(response).toHaveStatusCode(200);
        const metadata = response.body as InfraMetadata;
        expect(metadata.features ?? []).toStrictEqual([]);
      }
    );

    apiTest('keeps an Elastic Common Schema pod on the default path', async ({ apiClient }) => {
      const response = await apiClient.post('api/infra/metadata', {
        headers,
        responseType: 'json',
        body: {
          sourceId: 'default',
          nodeId: ECS_POD_UID,
          nodeType: 'pod',
          timeRange,
        },
      });

      expect(response).toHaveStatusCode(200);
      const metadata = response.body as InfraMetadata;
      // generatePodsData indexes container siblings with event.dataset=kubernetes.container
      // and pod metrics without event.dataset. Prove the ECS path found the pod and did
      // not switch to kubeletstats.
      expect(metadata.name).toBe(ECS_POD_UID);
      expect(metadata.features?.map((feature) => feature.name)).not.toContain(
        'kubeletstatsreceiver.otel'
      );
      expect(metadata.features?.map((feature) => feature.name)).toContain('kubernetes.container');
    });
  }
);
