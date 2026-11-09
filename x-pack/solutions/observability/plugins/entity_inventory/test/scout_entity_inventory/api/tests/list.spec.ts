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

const CART_API_ID = 'k8s.deployment:checkout/cart-api';
const DEPLOYMENT_IDS = [
  CART_API_ID,
  'k8s.deployment:checkout/payments',
  'k8s.deployment:platform/ingress',
];

const STATE_PATTERN = 'metrics-kubernetes.state_deployment-*';
const OTEL_PATTERN = 'metrics-k8sclusterreceiver.otel-*';

// No index maps `k8s.deployment.uid`, so each of the OpenTelemetry source's two plans (`TS` and
// `FROM`) reports it: the response carries the same entry twice.
const UID_UNAVAILABLE = {
  column: 'k8s.deployment.uid',
  indexPattern: OTEL_PATTERN,
  field: 'k8s.deployment.uid',
};
const UID_UNAVAILABLE_PER_OTEL_PLAN = [UID_UNAVAILABLE, UID_UNAVAILABLE];

type QueryDiagnostic = ListResponse['queries'][number];

const summarizeQueries = (
  queries: QueryDiagnostic[]
): Array<Pick<QueryDiagnostic, 'indexPattern' | 'engine' | 'rowCount'>> =>
  queries.map(({ indexPattern, engine, rowCount }) => ({ indexPattern, engine, rowCount }));

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
      'returns one row per deployment, merged from the Agent and OpenTelemetry sources',
      async ({ apiClient }) => {
        const response = await postList(apiClient, WINDOW);

        expect(response).toHaveStatusCode(200);
        const body: ListResponse = response.body;

        expect(body.rows.map((row) => row['entity.id']).sort()).toStrictEqual(DEPLOYMENT_IDS);
        expect(body.rows.find((row) => row['entity.id'] === CART_API_ID)).toStrictEqual({
          'entity.id': CART_API_ID,
          'kubernetes.namespace': 'checkout',
          'kubernetes.deployment.name': 'cart-api',
          'k8s.cluster.name': 'scout-cluster',
          'k8s.deployment.available': 3,
          'k8s.deployment.desired': 3,
          'k8s.deployment.paused': false,
          'k8s.deployment.label.app': 'cart-api',
          // Mapped in no index, so no plan reads a value for it.
          'k8s.deployment.uid': null,
          last_seen: '2026-11-01T10:01:00.000Z',
        });
        expect(body.total).toBe(3);
        expect(body.truncated).toBe(false);
        expect(body.errors).toStrictEqual([]);
        expect(body.unavailableColumns).toStrictEqual(UID_UNAVAILABLE_PER_OTEL_PLAN);
      }
    );

    apiTest(
      'returns the diagnostics: provenance per row, one query per plan and the wall time',
      async ({ apiClient }) => {
        const response = await postList(apiClient, WINDOW);

        expect(response).toHaveStatusCode(200);
        const body: ListResponse = response.body;

        expect(Object.keys(body.provenance).sort()).toStrictEqual(DEPLOYMENT_IDS);
        // Both sources report cart-api with last_seen 10:01:00; on that tie every attribute comes from
        // the Agent source, whose plan is listed first.
        expect(body.provenance[CART_API_ID]).toStrictEqual({
          'k8s.cluster.name': STATE_PATTERN,
          'k8s.deployment.available': STATE_PATTERN,
          'k8s.deployment.desired': STATE_PATTERN,
          'k8s.deployment.paused': STATE_PATTERN,
          'k8s.deployment.label.app': STATE_PATTERN,
        });
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
        // The OpenTelemetry time-series index holds no 2026-11-01 documents, so its `TS` plan reads none.
        expect(body.queries.map(({ rowCount }) => rowCount)).toStrictEqual([3, 0, 3]);
        expect(typeof body.took).toBe('number');
        expect('unsupportedMetrics' in body).toBe(false);
        expect('documentFilterWarnings' in body).toBe(false);
      }
    );

    apiTest(
      'reports an attribute mapped in no index as an unavailable column of each plan of its source',
      async ({ apiClient }) => {
        const response = await postList(
          apiClient,
          { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' },
          'internal/entity_inventory/entities/k8s.deployment/_list'
        );

        expect(response).toHaveStatusCode(200);
        const { columns, rows, errors, unavailableColumns }: ListResponse = response.body;

        expect(unavailableColumns).toStrictEqual(UID_UNAVAILABLE_PER_OTEL_PLAN);
        expect(columns.find(({ name }) => name === 'k8s.deployment.uid')).toStrictEqual({
          name: 'k8s.deployment.uid',
          kind: 'attribute',
          type: null,
        });
        expect(rows.map((row) => row['k8s.deployment.uid'])).toStrictEqual([null, null, null]);
        // An unmapped attribute leaves its plans usable, so nothing is reported in `errors`.
        expect(errors).toStrictEqual([]);
      }
    );

    apiTest('returns the typed columns in column order', async ({ apiClient }) => {
      const response = await postList(apiClient, WINDOW);

      expect(response).toHaveStatusCode(200);
      const { columns }: ListResponse = response.body;

      expect(columns).toStrictEqual([
        { name: 'entity.id', kind: 'id', type: 'keyword' },
        { name: 'kubernetes.namespace', kind: 'identity', type: 'keyword' },
        { name: 'kubernetes.deployment.name', kind: 'identity', type: 'keyword' },
        { name: 'k8s.cluster.name', kind: 'attribute', type: 'keyword' },
        { name: 'k8s.deployment.available', kind: 'attribute', type: 'long' },
        { name: 'k8s.deployment.desired', kind: 'attribute', type: 'long' },
        { name: 'k8s.deployment.paused', kind: 'attribute', type: 'boolean' },
        { name: 'k8s.deployment.label.app', kind: 'attribute', type: 'keyword' },
        // No type: no index maps it, so no plan settles one.
        { name: 'k8s.deployment.uid', kind: 'attribute', type: null },
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
      'gives a source with no time-series index a FROM plan only and lists its rows',
      async ({ apiClient }) => {
        // The Agent source's pattern holds only the state_deployment data stream.
        const response = await postList(
          apiClient,
          { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' },
          'internal/entity_inventory/entities/k8s.deployment/_list'
        );

        expect(response).toHaveStatusCode(200);
        const { queries, rows, provenance }: ListResponse = response.body;

        expect(
          summarizeQueries(queries).filter(({ indexPattern }) => indexPattern === STATE_PATTERN)
        ).toStrictEqual([{ indexPattern: STATE_PATTERN, engine: 'FROM', rowCount: 3 }]);
        expect(rows.map((row) => row['entity.id']).sort()).toStrictEqual(DEPLOYMENT_IDS);
        expect(provenance[CART_API_ID]['k8s.deployment.label.app']).toBe(STATE_PATTERN);
      }
    );

    apiTest(
      'lists deployments whose documents live only in the time-series index, through the TS plan',
      async ({ apiClient }) => {
        // 13:00 to 15:00 on 2026-11-05 holds only the time-series index's `timeseries/ts-window`
        // documents (14:00:00 and 14:01:00).
        const response = await postList(
          apiClient,
          { from: '2026-11-05T13:00:00.000Z', to: '2026-11-05T15:00:00.000Z' },
          'internal/entity_inventory/entities/k8s.deployment/_list'
        );

        expect(response).toHaveStatusCode(200);
        const { rows, total, errors, queries }: ListResponse = response.body;

        expect(rows).toStrictEqual([
          {
            'entity.id': 'k8s.deployment:timeseries/ts-window',
            'kubernetes.namespace': 'timeseries',
            'kubernetes.deployment.name': 'ts-window',
            'k8s.cluster.name': 'scout-cluster',
            'k8s.deployment.available': 2,
            'k8s.deployment.desired': 2,
            'k8s.deployment.paused': null,
            'k8s.deployment.label.app': null,
            'k8s.deployment.uid': null,
            last_seen: '2026-11-05T14:01:00.000Z',
          },
        ]);
        expect(total).toBe(1);
        expect(errors).toStrictEqual([]);
        expect(summarizeQueries(queries)).toStrictEqual([
          { indexPattern: STATE_PATTERN, engine: 'FROM', rowCount: 0 },
          { indexPattern: OTEL_PATTERN, engine: 'TS', rowCount: 1 },
          { indexPattern: OTEL_PATTERN, engine: 'FROM', rowCount: 0 },
        ]);
      }
    );

    apiTest(
      'lists a source with standard and time-series indices from both plans, reading each index once',
      async ({ apiClient }) => {
        // `streaming/tsds-shared` is in both OpenTelemetry indices, `tsds-only` in the time-series
        // index and `standard-only` in the data stream.
        const response = await postList(
          apiClient,
          { from: '2026-11-05T09:00:00.000Z', to: '2026-11-05T11:00:00.000Z' },
          'internal/entity_inventory/entities/k8s.deployment/_list'
        );

        expect(response).toHaveStatusCode(200);
        const { rows, total, truncated, errors, queries }: ListResponse = response.body;

        expect(
          rows.map(
            ({
              'entity.id': entityId,
              'k8s.deployment.available': available,
              last_seen: lastSeen,
            }) => ({ entityId, available, lastSeen })
          )
        ).toStrictEqual([
          // The time-series value (5, at 10:01:00) is newer than the data stream's (4, at 10:00:00).
          {
            entityId: 'k8s.deployment:streaming/tsds-shared',
            available: 5,
            lastSeen: '2026-11-05T10:01:00.000Z',
          },
          {
            entityId: 'k8s.deployment:streaming/standard-only',
            available: 1,
            lastSeen: '2026-11-05T10:00:00.000Z',
          },
          {
            entityId: 'k8s.deployment:streaming/tsds-only',
            available: 2,
            lastSeen: '2026-11-05T10:00:00.000Z',
          },
        ]);
        expect(total).toBe(3);
        expect(truncated).toBe(false);
        expect(errors).toStrictEqual([]);
        // Two rows per plan: `FROM` leaves out the time-series index (it would return tsds-only as
        // a third row) and `TS` reads only it (it would return standard-only).
        expect(summarizeQueries(queries)).toStrictEqual([
          { indexPattern: STATE_PATTERN, engine: 'FROM', rowCount: 0 },
          { indexPattern: OTEL_PATTERN, engine: 'TS', rowCount: 2 },
          { indexPattern: OTEL_PATTERN, engine: 'FROM', rowCount: 2 },
        ]);
      }
    );

    apiTest(
      'returns only the rows a filtered alias lets through, under both the TS and FROM plans',
      async ({ apiClient }) => {
        // `metrics-k8sclusterreceiver.otel-filtered` matches the OpenTelemetry pattern and points at
        // a standard and a time-series index whose own names do not; its filter keeps `kept-standard`
        // and `kept-tsds` and drops `dropped-standard` and `dropped-tsds`, all on 2026-11-07.
        const response = await postList(
          apiClient,
          { from: '2026-11-07T09:00:00.000Z', to: '2026-11-07T11:00:00.000Z' },
          'internal/entity_inventory/entities/k8s.deployment/_list'
        );

        expect(response).toHaveStatusCode(200);
        const { rows, total, errors, queries }: ListResponse = response.body;

        expect(rows.map((row) => row['entity.id'])).toStrictEqual([
          'k8s.deployment:aliased/kept-standard',
          'k8s.deployment:aliased/kept-tsds',
        ]);
        expect(total).toBe(2);
        expect(errors).toStrictEqual([]);
        expect(summarizeQueries(queries)).toStrictEqual([
          { indexPattern: STATE_PATTERN, engine: 'FROM', rowCount: 0 },
          { indexPattern: OTEL_PATTERN, engine: 'TS', rowCount: 1 },
          { indexPattern: OTEL_PATTERN, engine: 'FROM', rowCount: 1 },
        ]);
      }
    );

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
