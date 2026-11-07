/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, INTERNAL_HEADERS, listPath } from '../fixtures';

// The archive writes every deployment at 10:00:00 and 10:01:00 on 2026-11-01.
const K8S_DEPLOYMENT_LIST_PATH = listPath('k8s.deployment');
const WINDOW = { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' };

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

const STATE_PATTERN = 'metrics-kubernetes.state_deployment-*';
const OTEL_PATTERN = 'metrics-k8sclusterreceiver.otel-*';

// The archive's time-series index does not map `k8s.deployment.uid`, so its `TS` plan cannot fill
// `resource_id`; the standard data stream behind the same pattern still does.
const RESOURCE_ID_UNAVAILABLE = [
  { column: 'resource_id', indexPattern: OTEL_PATTERN, field: 'k8s.deployment.uid' },
];

interface ListResponse {
  columns: Array<{ name: string; kind: string; type: string | null }>;
  rows: Array<Record<string, unknown>>;
  provenance: Record<string, Record<string, string>>;
  total: number | null;
  truncated: boolean;
  took: number;
  queries: Array<{
    indexPattern: string;
    engine: string;
    esql: string;
    params: Array<Record<string, unknown>>;
    took: number | null;
    documentsFound: number | null;
    rowCount: number;
  }>;
  errors: Array<{ indexPattern: string; status: number | null; reason: string }>;
  unavailableColumns: Array<{ column: string; indexPattern: string; field: string }>;
}

apiTest.describe(
  'POST /internal/entity_inventory/entities/{type}/_list',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCookieHeader: Record<string, string>;

    // Internal routes are called by the browser with a session cookie, not an API key.
    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    const postList = (
      apiClient: ApiClientFixture,
      body: Record<string, unknown>,
      path: string = K8S_DEPLOYMENT_LIST_PATH
    ) =>
      apiClient.post(path, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body,
        responseType: 'json',
      });

    apiTest(
      'returns one row per deployment, merged across the Agent and OpenTelemetry sources',
      async ({ apiClient }) => {
        const response = await postList(apiClient, WINDOW);

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
        expect(body.unavailableColumns).toStrictEqual(RESOURCE_ID_UNAVAILABLE);
      }
    );

    apiTest(
      'returns the diagnostics: provenance per row, one query per plan and the wall time',
      async ({ apiClient }) => {
        const response = await postList(apiClient, WINDOW);

        expect(response).toHaveStatusCode(200);
        const body: ListResponse = response.body;

        expect(Object.keys(body.provenance).sort()).toStrictEqual(DEPLOYMENT_IDS);
        expect(body.provenance[CART_API_ID]).toMatchObject({
          paused: STATE_PATTERN,
          app: STATE_PATTERN,
          resource_id: OTEL_PATTERN,
        });
        // The OpenTelemetry pattern holds a time-series index, so it gets a TS plan before its FROM plan.
        expect(
          body.queries.map(({ indexPattern, engine }) => ({ indexPattern, engine }))
        ).toStrictEqual([
          { indexPattern: STATE_PATTERN, engine: 'FROM' },
          { indexPattern: OTEL_PATTERN, engine: 'TS' },
          { indexPattern: OTEL_PATTERN, engine: 'FROM' },
        ]);
        body.queries.forEach((query) => {
          expect(query.esql).toContain(`${query.engine} ${query.indexPattern}`);
          expect(query.params).toStrictEqual([{ from: WINDOW.from }, { to: WINDOW.to }]);
          expect(typeof query.took).toBe('number');
        });
        expect(body.queries.map(({ rowCount }) => rowCount)).toStrictEqual([3, 0, 3]);
        expect(typeof body.took).toBe('number');
        expect('unsupportedMetrics' in body).toBe(false);
        expect('documentFilterWarnings' in body).toBe(false);
      }
    );

    apiTest(
      'reports an attribute the time-series index does not map as unavailable',
      async ({ apiClient }) => {
        const response = await postList(apiClient, {
          from: '2026-11-05T09:00:00.000Z',
          to: '2026-11-05T11:00:00.000Z',
        });

        expect(response).toHaveStatusCode(200);
        const { rows, unavailableColumns }: ListResponse = response.body;

        expect(unavailableColumns).toStrictEqual(RESOURCE_ID_UNAVAILABLE);
        expect(rows.find((row) => row['entity.id'] === TSDS_ONLY_ID)).toMatchObject({
          resource_id: null,
        });
      }
    );

    apiTest('returns the typed columns in column order', async ({ apiClient }) => {
      const response = await postList(apiClient, WINDOW);

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
        const response = await postList(apiClient, {
          from: '2026-11-01T09:00:00.000Z',
          to: '2026-11-01T10:00:30.000Z',
        });

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
      const response = await postList(apiClient, {
        from: '2026-11-01T11:00:00+02:00',
        to: '2026-11-01T13:00:00+02:00',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(3);
    });

    apiTest('cuts the rows at limit, reports truncated with no total', async ({ apiClient }) => {
      const response = await postList(apiClient, { ...WINDOW, limit: 2 });

      expect(response).toHaveStatusCode(200);
      const { rows, provenance, total, truncated }: ListResponse = response.body;

      expect(rows).toHaveLength(2);
      expect(Object.keys(provenance).sort()).toStrictEqual(
        rows.map((row) => row['entity.id']).sort()
      );
      expect(total).toBeNull();
      expect(truncated).toBe(true);
    });

    apiTest('reports an exact total when limit equals the entity count', async ({ apiClient }) => {
      const response = await postList(apiClient, { ...WINDOW, limit: 3 });

      expect(response).toHaveStatusCode(200);
      const { rows, total, truncated }: ListResponse = response.body;

      expect(rows).toHaveLength(3);
      expect(total).toBe(3);
      expect(truncated).toBe(false);
    });

    apiTest(
      'returns deployments from time-series and standard indices once each, with the newest values',
      async ({ apiClient }) => {
        const response = await postList(apiClient, {
          from: '2026-11-05T09:00:00.000Z',
          to: '2026-11-05T11:00:00.000Z',
        });

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
      const response = await postList(apiClient, {
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-04T00:00:00.000Z',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(3);
    });

    apiTest('rejects a window over 72 hours with 400', async ({ apiClient }) => {
      const response = await postList(apiClient, {
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-04T00:00:01.000Z',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        'the time range from 2026-11-01T00:00:00.000Z to 2026-11-04T00:00:01.000Z is longer than the maximum of 72 hours'
      );
    });

    apiTest('rejects from equal to or after to with 400', async ({ apiClient }) => {
      const equal = await postList(apiClient, {
        from: '2026-11-01T09:00:00.000Z',
        to: '2026-11-01T09:00:00.000Z',
      });
      const reversed = await postList(apiClient, {
        from: '2026-11-01T11:00:00.000Z',
        to: '2026-11-01T09:00:00.000Z',
      });

      expect(equal).toHaveStatusCode(400);
      expect(equal.body.message).toContain('from must be earlier than to');
      expect(reversed).toHaveStatusCode(400);
      expect(reversed.body.message).toContain('from must be earlier than to');
    });

    apiTest('rejects a missing or malformed bound with 400', async ({ apiClient }) => {
      const missing = await postList(apiClient, { to: '2026-11-01T11:00:00.000Z' });
      const malformed = await postList(apiClient, {
        from: 'yesterday',
        to: '2026-11-01T11:00:00.000Z',
      });

      expect(missing).toHaveStatusCode(400);
      expect(malformed).toHaveStatusCode(400);
      expect(malformed.body.message).toContain('Invalid ISO datetime');
    });

    apiTest('rejects a limit below 1 or above 9,999 with 400', async ({ apiClient }) => {
      const tooSmall = await postList(apiClient, { ...WINDOW, limit: 0 });
      const tooBig = await postList(apiClient, { ...WINDOW, limit: 10000 });

      expect(tooSmall).toHaveStatusCode(400);
      expect(tooBig).toHaveStatusCode(400);
    });

    apiTest('rejects documentFilter in the body with 400', async ({ apiClient }) => {
      const response = await postList(apiClient, {
        ...WINDOW,
        documentFilter: 'kubernetes.namespace == "checkout"',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('rejects a limit sent as a string with 400', async ({ apiClient }) => {
      const response = await postList(apiClient, { ...WINDOW, limit: '1' });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('rejects a malformed type in the path with 400', async ({ apiClient }) => {
      const response = await postList(apiClient, WINDOW, listPath('K8S'));

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('type must start with a lowercase letter');
    });

    apiTest('answers 404 for a type with no entity definition', async ({ apiClient }) => {
      const response = await postList(apiClient, WINDOW, listPath('does.not.exist'));

      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe(
        'Entity type "does.not.exist" is not available in the entity inventory: no entity definition is registered for it'
      );
    });

    apiTest(
      'lists a type with a dynamic block that another plugin registered',
      async ({ apiClient }) => {
        const response = await postList(apiClient, WINDOW, listPath('host'));

        expect(response).toHaveStatusCode(200);
        expect(Array.isArray(response.body.rows)).toBe(true);
      }
    );

    apiTest('rejects a request without the kbn-xsrf header with 400', async ({ apiClient }) => {
      const response = await apiClient.post(K8S_DEPLOYMENT_LIST_PATH, {
        headers: { 'x-elastic-internal-origin': 'kibana', ...adminCookieHeader },
        body: WINDOW,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe('Request must contain a kbn-xsrf header.');
    });

    apiTest(
      'returns rows to a viewer, which can read the source indices',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.post(K8S_DEPLOYMENT_LIST_PATH, {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          body: WINDOW,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { rows, errors }: ListResponse = response.body;
        expect(rows.map((row) => row['entity.id']).sort()).toStrictEqual(DEPLOYMENT_IDS);
        expect(errors).toStrictEqual([]);
      }
    );

    apiTest(
      'returns no rows and reports every plan to a user without index privileges on the sources',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
        });

        const response = await apiClient.post(K8S_DEPLOYMENT_LIST_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: WINDOW,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { rows, errors, total, truncated }: ListResponse = response.body;
        // Elasticsearch drops the indices the user cannot read, so every plan reads nothing usable;
        // that is not a query failure, so the empty result is exact.
        expect(rows).toStrictEqual([]);
        expect(errors).toStrictEqual(
          [STATE_PATTERN, OTEL_PATTERN].map((indexPattern) => ({
            indexPattern,
            status: null,
            reason: `no readable index behind "${indexPattern}" maps @timestamp`,
          }))
        );
        expect(total).toBe(0);
        expect(truncated).toBe(false);
      }
    );
  }
);
