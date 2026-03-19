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
import {
  getEuidDslFilterBasedOnDocument,
  getEuidDslDocumentsContainsIdFilter,
} from '../../../../common/domain/euid/dsl';

function getTotal(hits: { total?: number | { value: number } }): number {
  const total = hits.total;
  if (total === undefined) return 0;
  return typeof total === 'number' ? total : total.value;
}

async function searchWithFilter(
  esClient: { search: (params: object) => Promise<unknown> },
  query: object | undefined,
  size = 100
) {
  return esClient.search({
    index: UPDATES_INDEX,
    query: query ? { ...query } : {},
    size,
  }) as Promise<{ hits: { hits: Array<{ _source?: unknown }>; total?: number | { value: number } } }>;
}

type DocSource = {
  user?: { name?: string; email?: string; id?: string };
  host?: { id?: string; name?: string; entity?: { id?: string } };
  entity?: { id?: string };
  service?: { name?: string; entity?: { id?: string } };
};

function getDocSource(hit: { _source?: unknown }): DocSource | undefined {
  return hit._source as DocSource | undefined;
}

function hasDocWith(
  hits: Array<{ _source?: unknown }>,
  predicate: (src: DocSource) => boolean
): boolean {
  return hits.some((h) => predicate(getDocSource(h) ?? {}));
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

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
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

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(3);
      expect(hasDocWith(result.hits.hits, (s) => s.host?.name === 'server-01')).toBe(true);
    }
  );

  apiTest(
    'host: DSL from doc with host.name only returns expected document',
    async ({ esClient }) => {
      const dsl = getEuidDslFilterBasedOnDocument('host', { host: { name: 'desktop-02' } });
      expect(dsl).toBeDefined();

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({ host: { name: 'desktop-02' } });
    }
  );

  apiTest(
    'user: DSL from doc with user.name + event.module returns exactly that document',
    async ({ esClient }) => {
      const docSource = {
        user: { name: 'arnlod.schmidt', domain: 'elastic.co' },
        event: { module: 'entityanalytics_ad' },
      };
      const dsl = getEuidDslFilterBasedOnDocument('user', docSource);
      expect(dsl).toBeDefined();

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({
        user: { name: 'arnlod.schmidt', domain: 'elastic.co' },
        event: { module: 'entityanalytics_ad' },
      });
    }
  );

  apiTest(
    'user: DSL from doc with user.name + event.module returns expected document',
    async ({ esClient }) => {
      const dsl = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'john.doe' },
        event: { module: 'okta' },
      });
      expect(dsl).toBeDefined();

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({ user: { name: 'john.doe' } });
    }
  );

  apiTest(
    'user: DSL from doc with data_stream.dataset only returns expected document',
    async ({ esClient }) => {
      const dsl = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'cloudtrail.user' },
        data_stream: { dataset: 'aws.cloudtrail' },
      });
      expect(dsl).toBeDefined();

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({ user: { name: 'cloudtrail.user' } });
    }
  );

  apiTest(
    'user: DSL from doc with no event.module or data_stream.dataset (unknown fallback) returns expected document',
    async ({ esClient }) => {
      const dsl = getEuidDslFilterBasedOnDocument('user', { user: { name: 'no.module.user' } });
      expect(dsl).toBeDefined();

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({ user: { name: 'no.module.user' } });
    }
  );

  apiTest(
    'service: DSL from doc with service.name returns exactly that document',
    async ({ esClient }) => {
      const dsl = getEuidDslFilterBasedOnDocument('service', { service: { name: 'mailchimp' } });
      expect(dsl).toBeDefined();

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({
        service: { entity: { id: 'mailchimp' } },
      });
    }
  );

  apiTest(
    'service: DSL from doc with service.name returns expected document',
    async ({ esClient }) => {
      const dsl = getEuidDslFilterBasedOnDocument('service', { service: { name: 'service-name' } });
      expect(dsl).toBeDefined();

      const result = await searchWithFilter(esClient, dsl, 10);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits[0]._source).toMatchObject({ service: { name: 'service-name' } });
    }
  );

  apiTest(
    'containsIdFilter: generic filter returns only docs with entity.id',
    async ({ esClient }) => {
      const dsl = getEuidDslDocumentsContainsIdFilter('generic');
      const result = await searchWithFilter(esClient, dsl);

      expect(getTotal(result.hits)).toBe(1);
      expect(result.hits.hits).toHaveLength(1);
      expect(result.hits.hits[0]._source).toMatchObject({ entity: { id: 'generic-id' } });
    }
  );

  apiTest(
    'containsIdFilter: service filter returns docs with service identity fields',
    async ({ esClient }) => {
      const dsl = getEuidDslDocumentsContainsIdFilter('service');
      const result = await searchWithFilter(esClient, dsl);

      expect(getTotal(result.hits)).toBe(2);
      expect(hasDocWith(result.hits.hits, (s) => s.service?.entity?.id === 'mailchimp')).toBe(true);
      expect(hasDocWith(result.hits.hits, (s) => s.service?.name === 'service-name')).toBe(true);
    }
  );

  apiTest(
    'containsIdFilter: user filter returns IDP docs, non-IDP docs, and excludes invalid docs',
    async ({ esClient }) => {
      const dsl = getEuidDslDocumentsContainsIdFilter('user');
      const result = await searchWithFilter(esClient, dsl);
      const { hits } = result.hits;

      expect(getTotal(result.hits)).toBeGreaterThan(0);

      // IDP docs (event.kind=asset or event.category=iam) must be returned
      expect(hasDocWith(hits, (s) => s.user?.name === 'john.doe')).toBe(true);
      expect(hasDocWith(hits, (s) => s.user?.name === 'arnlod.schmidt')).toBe(true);
      expect(hasDocWith(hits, (s) => s.user?.email === 'test@example.com')).toBe(true);
      expect(hasDocWith(hits, (s) => s.user?.id === 'user-101')).toBe(true);

      // Non-IDP doc (user.name + host.id, no event.kind=asset) must be returned
      expect(
        hasDocWith(
          hits,
          (s) => s.user?.name === 'alice.local' && s.host?.id === 'host-nonidp-001'
        )
      ).toBe(true);

      // Invalid doc (user.email + event.module only) must NOT be returned
      expect(
        hasDocWith(hits, (s) => s.user?.email === 'invalid-idp-illegal@test.com')
      ).toBe(false);
    }
  );

  apiTest(
    'containsIdFilter: host filter returns docs with any host identity field',
    async ({ esClient }) => {
      const dsl = getEuidDslDocumentsContainsIdFilter('host');
      const result = await searchWithFilter(esClient, dsl);

      expect(getTotal(result.hits)).toBeGreaterThan(0);
      expect(
        hasDocWith(result.hits.hits, (s) => s.host?.entity?.id === 'host-with-entity-id')
      ).toBe(true);
      expect(hasDocWith(result.hits.hits, (s) => s.host?.id === 'host-123')).toBe(true);
      expect(hasDocWith(result.hits.hits, (s) => s.host?.name === 'desktop-02')).toBe(true);
    }
  );

  apiTest(
    'containsIdFilter: does not match docs with no identity fields for the type',
    async ({ esClient }) => {
      const dsl = getEuidDslDocumentsContainsIdFilter('user');
      const result = await searchWithFilter(esClient, dsl);

      const bareDocMatched = hasDocWith(result.hits.hits, (s) => {
        const keys = Object.keys(s);
        return !s.user && !s.entity?.id && keys.length <= 1;
      });
      expect(bareDocMatched).toBe(false);
    }
  );
});
