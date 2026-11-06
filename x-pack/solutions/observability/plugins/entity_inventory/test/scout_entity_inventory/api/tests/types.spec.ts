/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, INTERNAL_HEADERS, TYPES_PATH } from '../fixtures';

// Unique per run, so setup and teardown touch only the space this run created.
const SPACE_ID = `entity-inventory-types-${randomUUID()}`;
// Every registered type with a `dynamic` block: the entity store's built-in `host` and this plugin's own.
const INVENTORY_TYPES = ['host', 'k8s.deployment'];
const K8S_DEPLOYMENT_IDENTITY_FIELDS = [
  'k8s.cluster.name',
  'k8s.namespace.name',
  'k8s.deployment.name',
  'orchestrator.cluster.name',
  'kubernetes.namespace',
  'kubernetes.deployment.name',
];

interface InventoryTypeResponse {
  type: string;
  name: string;
  identityFields: string[];
  columns: Array<{ name: string; kind: string }>;
  sources: Array<{ indexPattern: string; filter?: string }>;
}

apiTest.describe(
  'GET /internal/entity_inventory/types',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCookieHeader: Record<string, string>;

    // Internal routes are called by the browser with a session cookie, not an API key.
    apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      await apiServices.spaces.create({ id: SPACE_ID });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(SPACE_ID);
    });

    apiTest('returns k8s.deployment with identity, columns and sources', async ({ apiClient }) => {
      const response = await apiClient.get(TYPES_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { types }: { types: InventoryTypeResponse[] } = response.body;
      const k8sDeployment = types.find(({ type }) => type === 'k8s.deployment');

      expect(k8sDeployment).toBeDefined();
      expect(k8sDeployment?.name).toBe('K8s Deployment');
      expect(k8sDeployment?.identityFields).toStrictEqual(K8S_DEPLOYMENT_IDENTITY_FIELDS);
      expect(k8sDeployment?.columns[0].name).toBe('entity.id');
      expect(k8sDeployment?.sources).toHaveLength(2);
    });

    apiTest('returns every type with a dynamic block', async ({ apiClient }) => {
      const response = await apiClient.get(TYPES_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { types }: { types: InventoryTypeResponse[] } = response.body;

      expect(types.map(({ type }) => type).sort()).toStrictEqual(INVENTORY_TYPES);
    });

    apiTest('returns the same types in a non-default space', async ({ apiClient }) => {
      const defaultSpaceResponse = await apiClient.get(TYPES_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        responseType: 'json',
      });
      const customSpaceResponse = await apiClient.get(`s/${SPACE_ID}/${TYPES_PATH}`, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        responseType: 'json',
      });

      expect(defaultSpaceResponse).toHaveStatusCode(200);
      expect(customSpaceResponse).toHaveStatusCode(200);
      expect(customSpaceResponse.body).toStrictEqual(defaultSpaceResponse.body);
    });

    apiTest(
      'returns the same types to a viewer, since the route delegates authorization to Elasticsearch',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const adminResponse = await apiClient.get(TYPES_PATH, {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        });
        const viewerResponse = await apiClient.get(TYPES_PATH, {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          responseType: 'json',
        });

        expect(viewerResponse).toHaveStatusCode(200);
        expect(viewerResponse.body).toStrictEqual(adminResponse.body);
      }
    );
  }
);
