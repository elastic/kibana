/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, FILTER_VALUES_PATH, INTERNAL_HEADERS } from '../fixtures';

// The archive writes every deployment at 10:00:00 and 10:01:00 on 2026-11-01: two in the
// `checkout` namespace and one in `platform`, all in the cluster `scout-cluster`.
const WINDOW = { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' };
const BASE = { types: ['k8s.deployment'], ...WINDOW };

// The two suggested filters of `k8s.deployment`: an attribute and an identity field.
const CLUSTER = 'k8s.cluster.name';
const NAMESPACE = 'kubernetes.namespace';

const STATE_PATTERN = 'metrics-kubernetes.state_deployment-*';
const OTEL_PATTERN = 'metrics-k8sclusterreceiver.otel-*';

interface AttributeValuesResponse {
  values: string[];
  invalidSelections: string[];
  truncated: boolean;
  errors: Array<{ indexPattern: string; status: number | null; reason: string }>;
}

apiTest.describe(
  'POST /internal/entity_inventory/filters/_values',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCookieHeader: Record<string, string>;

    // Internal routes are called by the browser with a session cookie, not an API key.
    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    const postValues = (apiClient: ApiClientFixture, body: Record<string, unknown>) =>
      apiClient.post(FILTER_VALUES_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body,
        responseType: 'json',
      });

    apiTest('lists the clusters, merged from both sources', async ({ apiClient }) => {
      const response = await postValues(apiClient, { ...BASE, attribute: CLUSTER });

      expect(response).toHaveStatusCode(200);
      const body: AttributeValuesResponse = response.body;

      expect(body).toStrictEqual({
        values: ['scout-cluster'],
        invalidSelections: [],
        truncated: false,
        errors: [],
      });
    });

    apiTest('lists the namespaces, which are part of the identity', async ({ apiClient }) => {
      const response = await postValues(apiClient, { ...BASE, attribute: NAMESPACE });

      expect(response).toHaveStatusCode(200);
      const body: AttributeValuesResponse = response.body;

      expect(body.values).toStrictEqual(['checkout', 'platform']);
      expect(body.errors).toStrictEqual([]);
    });

    apiTest('narrows the values by the selections of the other filters', async ({ apiClient }) => {
      const inCluster = await postValues(apiClient, {
        ...BASE,
        attribute: NAMESPACE,
        filters: { [CLUSTER]: ['scout-cluster'] },
      });
      const inOtherCluster = await postValues(apiClient, {
        ...BASE,
        attribute: NAMESPACE,
        filters: { [CLUSTER]: ['other-cluster'] },
      });

      expect(inCluster).toHaveStatusCode(200);
      expect(inCluster.body.values).toStrictEqual(['checkout', 'platform']);
      expect(inOtherCluster).toHaveStatusCode(200);
      expect(inOtherCluster.body.values).toStrictEqual([]);
    });

    apiTest('narrows an attribute by an identity selection', async ({ apiClient }) => {
      const response = await postValues(apiClient, {
        ...BASE,
        attribute: CLUSTER,
        filters: { [NAMESPACE]: ['platform'] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.values).toStrictEqual(['scout-cluster']);
    });

    apiTest('reports a selected value that is no longer offered', async ({ apiClient }) => {
      const response = await postValues(apiClient, {
        ...BASE,
        attribute: NAMESPACE,
        selected: ['checkout', 'gone'],
      });

      expect(response).toHaveStatusCode(200);
      const body: AttributeValuesResponse = response.body;

      expect(body.values).toStrictEqual(['checkout', 'platform']);
      expect(body.invalidSelections).toStrictEqual(['gone']);
    });

    apiTest('cuts the values at limit and reports truncated', async ({ apiClient }) => {
      const response = await postValues(apiClient, { ...BASE, attribute: NAMESPACE, limit: 1 });

      expect(response).toHaveStatusCode(200);
      const body: AttributeValuesResponse = response.body;

      expect(body.values).toStrictEqual(['checkout']);
      expect(body.truncated).toBe(true);
    });

    apiTest('is not truncated when limit equals the number of values', async ({ apiClient }) => {
      const response = await postValues(apiClient, { ...BASE, attribute: NAMESPACE, limit: 2 });

      expect(response).toHaveStatusCode(200);
      expect(response.body.values).toStrictEqual(['checkout', 'platform']);
      expect(response.body.truncated).toBe(false);
    });

    apiTest('rejects an attribute no type suggests with 400', async ({ apiClient }) => {
      const response = await postValues(apiClient, {
        ...BASE,
        attribute: 'k8s.deployment.paused',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('not a suggested filter');
    });

    apiTest('answers 404 for a type with no entity definition', async ({ apiClient }) => {
      const response = await postValues(apiClient, {
        ...BASE,
        types: ['does.not.exist'],
        attribute: CLUSTER,
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe(
        'Entity type "does.not.exist" is not available in the entity inventory: no entity definition is registered for it'
      );
    });

    apiTest('rejects from equal to or after to with 400', async ({ apiClient }) => {
      const response = await postValues(apiClient, {
        ...BASE,
        attribute: CLUSTER,
        from: WINDOW.to,
        to: WINDOW.from,
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('from must be earlier than to');
    });

    apiTest('rejects a request with no types with 400', async ({ apiClient }) => {
      const response = await postValues(apiClient, { ...BASE, attribute: CLUSTER, types: [] });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('rejects a limit below 1 or above 9,999 with 400', async ({ apiClient }) => {
      const tooSmall = await postValues(apiClient, { ...BASE, attribute: CLUSTER, limit: 0 });
      const tooBig = await postValues(apiClient, { ...BASE, attribute: CLUSTER, limit: 10000 });

      expect(tooSmall).toHaveStatusCode(400);
      expect(tooBig).toHaveStatusCode(400);
    });

    apiTest('rejects documentFilter in the body with 400', async ({ apiClient }) => {
      const response = await postValues(apiClient, {
        ...BASE,
        attribute: CLUSTER,
        documentFilter: { bool: {} },
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('rejects a request without the kbn-xsrf header with 400', async ({ apiClient }) => {
      const response = await apiClient.post(FILTER_VALUES_PATH, {
        headers: { 'x-elastic-internal-origin': 'kibana', ...adminCookieHeader },
        body: { ...BASE, attribute: CLUSTER },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe('Request must contain a kbn-xsrf header.');
    });

    apiTest(
      'returns values to a viewer, which can read the source indices',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.post(FILTER_VALUES_PATH, {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          body: { ...BASE, attribute: CLUSTER },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.values).toStrictEqual(['scout-cluster']);
        expect(response.body.errors).toStrictEqual([]);
      }
    );

    apiTest(
      'returns no values and reports every source to a user without index privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
        });

        const response = await apiClient.post(FILTER_VALUES_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { ...BASE, attribute: CLUSTER },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body: AttributeValuesResponse = response.body;

        // Elasticsearch drops the indices the user cannot read, so no source can be probed; each is
        // reported in `errors`, and that is not truncation.
        expect(body.values).toStrictEqual([]);
        expect(body.errors.map(({ indexPattern }) => indexPattern).sort()).toStrictEqual(
          [STATE_PATTERN, OTEL_PATTERN].sort()
        );
        expect(body.truncated).toBe(false);
      }
    );
  }
);
