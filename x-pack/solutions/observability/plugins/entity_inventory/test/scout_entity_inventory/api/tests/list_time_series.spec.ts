/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, INTERNAL_HEADERS } from '../fixtures';

// A time-series data stream behind the OpenTelemetry source pattern `metrics-k8sclusterreceiver.otel-*`,
// next to the archive's standard `metrics-k8sclusterreceiver.otel-default`. A time-series data stream
// only accepts documents near the current time, so the documents are written here, not archived.
const TSDS_TEMPLATE = 'entity-inventory-scout-k8sclusterreceiver-tsds';
const TSDS_DATA_STREAM = 'metrics-k8sclusterreceiver.otel-scouttsds';
const STANDARD_DATA_STREAM = 'metrics-k8sclusterreceiver.otel-default';

// In both streams: the list must return it once, with the newer time-series values.
const SHARED_DEPLOYMENT = 'tsds-shared';
// Only in the time-series stream: the list must return it from the `TS` plan alone.
const TSDS_ONLY_DEPLOYMENT = 'tsds-only';
// Only in the standard stream: the list must still read it through the `FROM` plan.
const STANDARD_ONLY_DEPLOYMENT = 'standard-only';
// Unique per run, so the rows and the cleanup touch only the documents this run wrote.
const NAMESPACE = `tsds-${randomUUID()}`;
const DEPLOYMENT_NAMES = [SHARED_DEPLOYMENT, TSDS_ONLY_DEPLOYMENT, STANDARD_ONLY_DEPLOYMENT];

const LIST_PATH = 'internal/entity_inventory/entities/k8s.deployment/list';

const deploymentId = (name: string) => `k8s.deployment:scout-cluster/${NAMESPACE}/${name}`;

const otelDocument = (name: string, timestamp: string, available: number) => ({
  '@timestamp': timestamp,
  k8s: {
    cluster: { name: 'scout-cluster' },
    namespace: { name: NAMESPACE },
    deployment: { name, uid: `uid-${name}`, available, desired: 5 },
  },
});

const dimension = { type: 'keyword', time_series_dimension: true } as const;
const gauge = { type: 'long', time_series_metric: 'gauge' } as const;

interface ListResponse {
  rows: Array<Record<string, unknown>>;
  errors: Array<{ indexPattern: string; status: number | null; reason: string }>;
}

apiTest.describe(
  'GET /internal/entity_inventory/entities/{type}/list over a time-series data stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCookieHeader: Record<string, string>;
    // Ids of the documents this run wrote to the archive's shared standard stream.
    let standardDocumentIds: string[] = [];
    const now = Date.now();
    const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));

      await esClient.indices.putIndexTemplate({
        name: TSDS_TEMPLATE,
        index_patterns: [TSDS_DATA_STREAM],
        data_stream: {},
        // Above the archive's `metrics-k8sclusterreceiver.otel-*` template (200).
        priority: 300,
        template: {
          settings: {
            mode: 'time_series',
            routing_path: ['k8s.cluster.name', 'k8s.namespace.name', 'k8s.deployment.name'],
          },
          mappings: {
            dynamic: false,
            properties: {
              '@timestamp': { type: 'date' },
              k8s: {
                properties: {
                  cluster: { properties: { name: dimension } },
                  namespace: { properties: { name: dimension } },
                  deployment: {
                    properties: {
                      name: dimension,
                      uid: { type: 'keyword' },
                      available: gauge,
                      desired: gauge,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const { errors, items } = await esClient.bulk({
        refresh: 'wait_for',
        operations: [
          { create: { _index: TSDS_DATA_STREAM } },
          otelDocument(SHARED_DEPLOYMENT, minutesAgo(2), 5),
          { create: { _index: TSDS_DATA_STREAM } },
          otelDocument(TSDS_ONLY_DEPLOYMENT, minutesAgo(3), 2),
          { create: { _index: STANDARD_DATA_STREAM } },
          otelDocument(SHARED_DEPLOYMENT, minutesAgo(10), 4),
          { create: { _index: STANDARD_DATA_STREAM } },
          otelDocument(STANDARD_ONLY_DEPLOYMENT, minutesAgo(4), 1),
        ],
      });
      expect(errors).toBe(false);
      standardDocumentIds = items.flatMap(({ create }) =>
        create?._index.includes(STANDARD_DATA_STREAM) && create._id ? [create._id] : []
      );
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.deleteDataStream({ name: TSDS_DATA_STREAM });
      await esClient.indices.deleteIndexTemplate({ name: TSDS_TEMPLATE });
      await esClient.deleteByQuery({
        index: STANDARD_DATA_STREAM,
        refresh: true,
        query: { ids: { values: standardDocumentIds } },
      });
    });

    apiTest(
      'returns deployments from both streams once each, with the newest values',
      async ({ apiClient }) => {
        const from = encodeURIComponent(minutesAgo(60));
        const to = encodeURIComponent(new Date(now + 60_000).toISOString());

        const response = await apiClient.get(`${LIST_PATH}?from=${from}&to=${to}`, {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { rows, errors }: ListResponse = response.body;
        // Only this suite's namespace: other data on a reused cluster must not matter.
        const suiteRows = rows.filter((row) => row['k8s.namespace.name'] === NAMESPACE);

        expect(errors).toStrictEqual([]);
        expect(suiteRows.map((row) => row['entity.id']).sort()).toStrictEqual(
          DEPLOYMENT_NAMES.map(deploymentId).sort()
        );
        expect(
          suiteRows.find((row) => row['entity.id'] === deploymentId(SHARED_DEPLOYMENT))
        ).toMatchObject({
          available_replicas: 5,
          resource_id: `uid-${SHARED_DEPLOYMENT}`,
          last_seen: minutesAgo(2),
        });
        expect(
          suiteRows.find((row) => row['entity.id'] === deploymentId(TSDS_ONLY_DEPLOYMENT))
        ).toMatchObject({
          available_replicas: 2,
          last_seen: minutesAgo(3),
        });
        expect(
          suiteRows.find((row) => row['entity.id'] === deploymentId(STANDARD_ONLY_DEPLOYMENT))
        ).toMatchObject({
          available_replicas: 1,
          last_seen: minutesAgo(4),
        });
      }
    );
  }
);
