/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  MAINTAINER_ROUTES,
  LATEST_INDEX,
  FF_ENABLE_ENTITY_STORE_V2,
} from '../fixtures/constants';
import {
  bulkIngestEvents,
  ensureDataStream,
  cleanupDataStream,
  getExpectedRelationships,
} from '../fixtures/helpers';

/** Normalise a field that may be a single string or an array into a string[]. */
function toArray(value: unknown): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? (value as string[]) : [value as string];
}

apiTest.describe('Accesses Frequently/Infrequently Maintainer', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient, esClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(installResponse.statusCode).toBe(201);

    await ensureDataStream(esClient);
    const ingestedCount = await bulkIngestEvents(esClient);
    expect(ingestedCount).toBe(16000);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    await apiClient
      .post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      })
      .catch(() => {});

    await cleanupDataStream(esClient);
  });

  apiTest(
    'Should compute access relationships from Elastic Defend events',
    async ({ apiClient, esClient }) => {
      const maintainerResponse = await apiClient.post(MAINTAINER_ROUTES.RUN, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(maintainerResponse.statusCode).toBe(200);
      expect(maintainerResponse.body.totalBuckets).toBe(6);
      expect(maintainerResponse.body.totalAccessRecords).toBe(16);
      expect(maintainerResponse.body.totalUpserted).toBe(16);

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            fromDateISO: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            toDateISO: new Date().toISOString(),
          },
        }
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body.success).toBe(true);

      await esClient.indices.refresh({ index: LATEST_INDEX });

      const entities = await esClient.search({
        index: LATEST_INDEX,
        query: {
          bool: {
            filter: {
              wildcard: { 'entity.id': 'user:test-user-*' },
            },
          },
        },
        size: 100,
      });

      expect(entities.hits.hits).toHaveLength(16);

      const expectedRelationships = getExpectedRelationships();

      for (const hit of entities.hits.hits) {
        const source = hit._source as Record<string, unknown>;
        const entityId = source['entity.id'] as string;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const expected = expectedRelationships.get(entityId)!;
        expect(expected).toBeDefined();

        const actualFrequent = toArray(source['entity.relationships.accesses_frequently']).sort();
        const actualInfrequent = toArray(
          source['entity.relationships.accesses_infrequently']
        ).sort();

        expect(actualFrequent).toStrictEqual(expected.accesses_frequently.sort());
        expect(actualInfrequent).toStrictEqual(expected.accesses_infrequently.sort());
      }
    }
  );

  apiTest(
    'Should assign accesses_frequently when access count exceeds threshold',
    async ({ esClient }) => {
      const entities = await esClient.search({
        index: LATEST_INDEX,
        query: {
          bool: {
            filter: {
              wildcard: { 'entity.id': 'user:test-user-003@*' },
            },
          },
        },
        sort: [{ 'entity.id': 'asc' }],
        size: 10,
      });

      expect(entities.hits.hits).toHaveLength(2);

      for (const hit of entities.hits.hits) {
        const source = hit._source as Record<string, unknown>;

        expect(toArray(source['entity.relationships.accesses_frequently'])).toHaveLength(1);
        expect(toArray(source['entity.relationships.accesses_infrequently'])).toHaveLength(0);
      }
    }
  );

  apiTest(
    'Should assign accesses_infrequently when access count is at or below threshold',
    async ({ esClient }) => {
      const entities = await esClient.search({
        index: LATEST_INDEX,
        query: {
          bool: {
            filter: {
              term: { 'entity.id': 'user:test-user-001@test-host-002' },
            },
          },
        },
        size: 1,
      });

      expect(entities.hits.hits).toHaveLength(1);

      const source = entities.hits.hits[0]._source as Record<string, unknown>;

      expect(toArray(source['entity.relationships.accesses_frequently'])).toHaveLength(0);
      expect(toArray(source['entity.relationships.accesses_infrequently'])).toStrictEqual([
        'test-host-002',
      ]);
    }
  );

  apiTest(
    'Should assign both accesses_frequently and accesses_infrequently for user-006',
    async ({ esClient }) => {
      const entities = await esClient.search({
        index: LATEST_INDEX,
        query: {
          bool: {
            filter: {
              wildcard: { 'entity.id': 'user:test-user-006@*' },
            },
          },
        },
        sort: [{ 'entity.id': 'asc' }],
        size: 10,
      });

      expect(entities.hits.hits).toHaveLength(6);

      const frequentHosts: string[] = [];
      const infrequentHosts: string[] = [];

      for (const hit of entities.hits.hits) {
        const source = hit._source as Record<string, unknown>;
        const freq = toArray(source['entity.relationships.accesses_frequently']);
        const infreq = toArray(source['entity.relationships.accesses_infrequently']);
        frequentHosts.push(...freq);
        infrequentHosts.push(...infreq);
      }

      expect(frequentHosts.sort()).toStrictEqual([
        'test-host-006',
        'test-host-007',
        'test-host-008',
      ]);
      expect(infrequentHosts.sort()).toStrictEqual([
        'test-host-009',
        'test-host-010',
        'test-host-011',
      ]);
    }
  );
});
