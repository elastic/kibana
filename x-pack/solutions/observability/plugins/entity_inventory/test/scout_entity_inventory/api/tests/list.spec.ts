/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, INTERNAL_HEADERS } from '../fixtures';

// The archive writes every deployment at 10:00:00 and 10:01:00 on 2026-11-01.
const K8S_DEPLOYMENT_LIST_PATH = 'internal/entity_inventory/entities/k8s.deployment/list';

const CART_API_ID = 'k8s.deployment:scout-cluster/checkout/cart-api';
const DEPLOYMENT_IDS = [
  CART_API_ID,
  'k8s.deployment:scout-cluster/checkout/payments',
  'k8s.deployment:scout-cluster/platform/ingress',
];

// The archive's `streaming` namespace on 2026-11-05, behind `metrics-k8sclusterreceiver.otel-*`: the
// time-series index `metrics-k8sclusterreceiver.otel-tsds` and the standard data stream
// `metrics-k8sclusterreceiver.otel-default`.
const streamingDeploymentId = (name: string) => `k8s.deployment:scout-cluster/streaming/${name}`;
// In both: returned once, with the newer time-series values.
const TSDS_SHARED_ID = streamingDeploymentId('tsds-shared');
// Only in the time-series index: returned from the `TS` plan alone.
const TSDS_ONLY_ID = streamingDeploymentId('tsds-only');
// Only in the standard data stream: still read through the `FROM` plan.
const STANDARD_ONLY_ID = streamingDeploymentId('standard-only');

interface ListResponse {
  columns: Array<{ name: string; kind: string; type: string | null }>;
  rows: Array<Record<string, unknown>>;
  total: number | null;
  truncated: boolean;
  errors: Array<{ indexPattern: string; status: number | null; reason: string }>;
  unavailableColumns: Array<{ column: string; indexPattern: string; field: string }>;
}

apiTest.describe(
  'GET /internal/entity_inventory/entities/{type}/list',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCookieHeader: Record<string, string>;

    // Internal routes are called by the browser with a session cookie, not an API key.
    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest(
      'returns one row per deployment, merged across the Agent and OpenTelemetry sources',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z`,
          {
            headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const body: ListResponse = response.body;

        expect(body.rows.map((row) => row['entity.id']).sort()).toStrictEqual(DEPLOYMENT_IDS);
        expect(body.rows.find((row) => row['entity.id'] === CART_API_ID)).toStrictEqual({
          'entity.id': CART_API_ID,
          'k8s.cluster.name': 'scout-cluster',
          'k8s.namespace.name': 'checkout',
          'k8s.deployment.name': 'cart-api',
          'orchestrator.cluster.name': 'scout-cluster',
          'kubernetes.namespace': 'checkout',
          'kubernetes.deployment.name': 'cart-api',
          available_replicas: 3,
          desired_replicas: 3,
          paused: false,
          app: 'cart-api',
          resource_id: 'uid-checkout-cart-api',
          last_seen: '2026-11-01T10:01:00.000Z',
        });
        expect(body.total).toBe(3);
        expect(body.truncated).toBe(false);
        expect(body.errors).toStrictEqual([]);
        expect(body.unavailableColumns).toStrictEqual([]);
      }
    );

    apiTest('returns the typed columns in column order', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const { columns }: ListResponse = response.body;

      expect(columns).toStrictEqual([
        { name: 'entity.id', kind: 'id', type: 'keyword' },
        { name: 'k8s.cluster.name', kind: 'identity', type: 'keyword' },
        { name: 'k8s.namespace.name', kind: 'identity', type: 'keyword' },
        { name: 'k8s.deployment.name', kind: 'identity', type: 'keyword' },
        { name: 'orchestrator.cluster.name', kind: 'identity', type: 'keyword' },
        { name: 'kubernetes.namespace', kind: 'identity', type: 'keyword' },
        { name: 'kubernetes.deployment.name', kind: 'identity', type: 'keyword' },
        { name: 'available_replicas', kind: 'attribute', type: 'long' },
        { name: 'desired_replicas', kind: 'attribute', type: 'long' },
        { name: 'paused', kind: 'attribute', type: 'boolean' },
        { name: 'app', kind: 'attribute', type: 'keyword' },
        { name: 'resource_id', kind: 'attribute', type: 'keyword' },
        { name: 'last_seen', kind: 'last_seen', type: 'date' },
      ]);
    });

    apiTest(
      'reports last_seen as the newest timestamp inside the window',
      async ({ apiClient }) => {
        // Ends before the 10:01:00 documents, so only the 10:00:00 ones are read.
        const response = await apiClient.get(
          `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T10:00:30.000Z`,
          {
            headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const { rows, total }: ListResponse = response.body;

        expect(total).toBe(3);
        expect(rows.map((row) => row.last_seen)).toStrictEqual([
          '2026-11-01T10:00:00.000Z',
          '2026-11-01T10:00:00.000Z',
          '2026-11-01T10:00:00.000Z',
        ]);
      }
    );

    apiTest('accepts bounds with an offset other than Z', async ({ apiClient }) => {
      // `+` is percent-encoded as `%2B`; left raw, a query string decodes it as a space.
      const response = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T11:00:00%2B02:00&to=2026-11-01T13:00:00%2B02:00`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(3);
    });

    apiTest('cuts the rows at limit, reports truncated with no total', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z&limit=1`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const { rows, total, truncated }: ListResponse = response.body;

      expect(rows).toHaveLength(1);
      expect(total).toBeNull();
      expect(truncated).toBe(true);
    });

    apiTest('reports an exact total when limit equals the entity count', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z&limit=3`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const { rows, total, truncated }: ListResponse = response.body;

      expect(rows).toHaveLength(3);
      expect(total).toBe(3);
      expect(truncated).toBe(false);
    });

    apiTest(
      'returns deployments from time-series and standard indices once each, with the newest values',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-05T09:00:00.000Z&to=2026-11-05T11:00:00.000Z`,
          {
            headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const { rows, total, errors }: ListResponse = response.body;

        expect(errors).toStrictEqual([]);
        expect(total).toBe(3);
        expect(rows.map((row) => row['entity.id']).sort()).toStrictEqual(
          [TSDS_SHARED_ID, TSDS_ONLY_ID, STANDARD_ONLY_ID].sort()
        );
        expect(rows.find((row) => row['entity.id'] === TSDS_SHARED_ID)).toMatchObject({
          available_replicas: 5,
          resource_id: 'uid-streaming-tsds-shared',
          last_seen: '2026-11-05T10:01:00.000Z',
        });
        expect(rows.find((row) => row['entity.id'] === TSDS_ONLY_ID)).toMatchObject({
          available_replicas: 2,
          last_seen: '2026-11-05T10:00:00.000Z',
        });
        expect(rows.find((row) => row['entity.id'] === STANDARD_ONLY_ID)).toMatchObject({
          available_replicas: 1,
          last_seen: '2026-11-05T10:00:00.000Z',
        });
      }
    );

    apiTest('accepts a window of exactly 72 hours', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T00:00:00.000Z&to=2026-11-04T00:00:00.000Z`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(3);
    });

    apiTest('rejects a window over 72 hours with 400', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T00:00:00.000Z&to=2026-11-04T00:00:01.000Z`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        'the time range from 2026-11-01T00:00:00.000Z to 2026-11-04T00:00:01.000Z is longer than the maximum of 72 hours'
      );
    });

    apiTest('rejects from equal to or after to with 400', async ({ apiClient }) => {
      const equal = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T09:00:00.000Z`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );
      const reversed = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T11:00:00.000Z&to=2026-11-01T09:00:00.000Z`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(equal).toHaveStatusCode(400);
      expect(equal.body.message).toContain('from must be earlier than to');
      expect(reversed).toHaveStatusCode(400);
      expect(reversed.body.message).toContain('from must be earlier than to');
    });

    apiTest('rejects a missing or malformed bound with 400', async ({ apiClient }) => {
      const missing = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?to=2026-11-01T11:00:00.000Z`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );
      const malformed = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=yesterday&to=2026-11-01T11:00:00.000Z`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(missing).toHaveStatusCode(400);
      expect(malformed).toHaveStatusCode(400);
      expect(malformed.body.message).toContain('Invalid ISO datetime');
    });

    apiTest('rejects a limit below 1 or above 9,999 with 400', async ({ apiClient }) => {
      const tooSmall = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z&limit=0`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );
      const tooBig = await apiClient.get(
        `${K8S_DEPLOYMENT_LIST_PATH}?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z&limit=10000`,
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(tooSmall).toHaveStatusCode(400);
      expect(tooBig).toHaveStatusCode(400);
    });

    apiTest('rejects a malformed type in the path with 400', async ({ apiClient }) => {
      const response = await apiClient.get(
        'internal/entity_inventory/entities/K8S/list?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z',
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('type must start with a lowercase letter');
    });

    apiTest('answers 404 for a type with no entity definition', async ({ apiClient }) => {
      const response = await apiClient.get(
        'internal/entity_inventory/entities/does.not.exist/list?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z',
        {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe(
        'Entity type "does.not.exist" is not available in the entity inventory: no entity definition is registered for it'
      );
    });

    apiTest('returns the deployments to a viewer', async ({ apiClient, samlAuth }) => {
      const { cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(
        'internal/entity_inventory/entities/k8s.deployment/list?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z',
        {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const body: ListResponse = response.body;
      expect(body.rows.map((row) => row['entity.id']).sort()).toStrictEqual(DEPLOYMENT_IDS);
    });

    apiTest(
      'returns no rows to a user who cannot read the source indices',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: restrictedCookieHeader } = await samlAuth.asInteractiveUser({
          kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
          elasticsearch: { cluster: [], indices: [{ names: ['logs-*'], privileges: ['read'] }] },
        });

        const response = await apiClient.get(
          'internal/entity_inventory/entities/k8s.deployment/list?from=2026-11-01T09:00:00.000Z&to=2026-11-01T11:00:00.000Z',
          {
            headers: { ...INTERNAL_HEADERS, ...restrictedCookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const body: ListResponse = response.body;
        expect(body.rows).toStrictEqual([]);
      }
    );
  }
);
