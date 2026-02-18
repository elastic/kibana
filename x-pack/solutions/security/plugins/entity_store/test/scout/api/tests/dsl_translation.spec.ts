/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '@kbn/scout-security';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { getEuidDslFilterBasedOnDocument } from '../../../../common/domain/euid/dsl';

function getTotal(hits: { total?: number | { value: number } }): number {
  const total = hits.total;
  if (total === undefined) return 0;
  return typeof total === 'number' ? total : total.value;
}

apiTest.describe('DSL query translation', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esArchiver, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    const response = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(201);

    await esArchiver.loadIfNeeded(
      'x-pack/solutions/security/plugins/entity_store/test/scout/api/es_archives/updates'
    );
  });

  apiTest.afterAll(async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });

  apiTest(
    'generic: DSL from doc with entity.id returns exactly that document',
    async ({ esClient }) => {
      const docSource = { entity: { id: 'generic-id' } };
      const dsl = getEuidDslFilterBasedOnDocument('generic', docSource);
      expect(dsl).toBeDefined();

      const result = await esClient.search({
        index: UPDATES_INDEX,
        query: { ...dsl },
        size: 10,
      });

      const total = getTotal(result.hits);
      expect(total).toBe(1);
      expect(result.hits.hits).toHaveLength(1);
      expect(result.hits.hits[0]._source).toMatchObject({ entity: { id: 'generic-id' } });
    }
  );

  apiTest(
    'host: DSL from doc with host.name + host.domain returns expected document(s)',
    async ({ esClient }) => {
      const docSource = { host: { name: 'server-01', domain: 'example.com' } };
      const dsl = getEuidDslFilterBasedOnDocument('host', docSource);
      expect(dsl).toBeDefined();

      const result = await esClient.search({
        index: UPDATES_INDEX,
        query: { ...dsl },
        size: 10,
      });

      const total = getTotal(result.hits);
      expect(total).toBe(1);
      const hasExpected = result.hits.hits.some((h) => {
        const src = h._source as { host?: { name?: string; domain?: string } } | undefined;
        return src?.host?.name === 'server-01' && src?.host?.domain === 'example.com';
      });
      expect(hasExpected).toBe(true);
    }
  );

  apiTest(
    'host: DSL from doc with host.name only returns expected document',
    async ({ esClient }) => {
      const docSource = { host: { name: 'desktop-02' } };
      const dsl = getEuidDslFilterBasedOnDocument('host', docSource);
      expect(dsl).toBeDefined();

      const result = await esClient.search({
        index: UPDATES_INDEX,
        query: { ...dsl },
        size: 10,
      });

      const total = getTotal(result.hits);
      expect(total).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({
        host: { name: 'desktop-02' },
      });
    }
  );

  apiTest(
    'user: DSL from doc with user.entity.id returns exactly that document',
    async ({ esClient }) => {
      const docSource = { user: { entity: { id: 'non-generated-user' } } };
      const dsl = getEuidDslFilterBasedOnDocument('user', docSource);
      expect(dsl).toBeDefined();

      const result = await esClient.search({
        index: UPDATES_INDEX,
        query: { ...dsl },
        size: 10,
      });

      const total = getTotal(result.hits);
      expect(total).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({
        user: { entity: { id: 'non-generated-user' } },
      });
    }
  );

  apiTest(
    'user: DSL from doc with user.name + host.entity.id returns expected document',
    async ({ esClient }) => {
      const docSource = {
        user: { name: 'john.doe' },
        host: { entity: { id: 'host-123' } },
      };
      const dsl = getEuidDslFilterBasedOnDocument('user', docSource);
      expect(dsl).toBeDefined();

      const result = await esClient.search({
        index: UPDATES_INDEX,
        query: { ...dsl },
        size: 10,
      });

      const total = getTotal(result.hits);
      expect(total).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({
        user: { name: 'john.doe' },
        host: { entity: { id: 'host-123' } },
      });
    }
  );

  apiTest(
    'service: DSL from doc with service.entity.id returns exactly that document',
    async ({ esClient }) => {
      const docSource = { service: { entity: { id: 'non-generated-service-id' } } };
      const dsl = getEuidDslFilterBasedOnDocument('service', docSource);
      expect(dsl).toBeDefined();

      const result = await esClient.search({
        index: UPDATES_INDEX,
        query: { ...dsl },
        size: 10,
      });

      const total = getTotal(result.hits);
      expect(total).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({
        service: { entity: { id: 'non-generated-service-id' } },
      });
    }
  );

  apiTest(
    'service: DSL from doc with service.name returns expected document',
    async ({ esClient }) => {
      const docSource = { service: { name: 'service-name' } };
      const dsl = getEuidDslFilterBasedOnDocument('service', docSource);
      expect(dsl).toBeDefined();

      const result = await esClient.search({
        index: UPDATES_INDEX,
        query: { ...dsl },
        size: 10,
      });

      const total = getTotal(result.hits);
      expect(total).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({
        service: { name: 'service-name' },
      });
    }
  );
});
