/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

const CCS_TEST_HOST_LOGS_INDEX = 'ccs-test-host-logs';
const FROM_DATE = '2026-02-25T10:00:00Z';
const TO_DATE = '2026-02-25T12:00:00Z';
const MAX_DATE_OF_UPDATES = '2026-02-25T12:10:01Z';

async function createCcsTestHostLogsIndex(esClient: EsClient) {
  await esClient.indices.create({
    index: CCS_TEST_HOST_LOGS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        host: {
          properties: {
            entity: { properties: { id: { type: 'keyword' } } },
            id: { type: 'keyword' },
            name: { type: 'keyword' },
            domain: { type: 'keyword' },
            hostname: { type: 'keyword' },
            architecture: { type: 'keyword' },
          },
        },
      },
    },
  });
}

async function ingestHostDoc(
  esClient: EsClient,
  doc: Record<string, unknown> & { '@timestamp': string }
) {
  await esClient.index({
    index: CCS_TEST_HOST_LOGS_INDEX,
    refresh: 'wait_for',
    body: doc,
  });
}

apiTest.describe(
  'Entity Store CCS logs extraction (test against local instance)',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...COMMON_HEADERS,
      };

      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await esClient.indices.delete(
        {
          index: CCS_TEST_HOST_LOGS_INDEX,
        },
        { ignore: [404] }
      );
      await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest(
      'Should run CCS extraction and write aggregated host entities to updates index',
      async ({ apiClient, esClient }) => {
        await createCcsTestHostLogsIndex(esClient);

        // Entity A: host.entity.id — multiple docs for collect_values (host.architecture) and prefer_newest_value (entity.name from host.name)
        await ingestHostDoc(esClient, {
          '@timestamp': '2026-02-25T10:00:01Z',
          host: { entity: { id: 'host-entity-a' }, name: 'name-a1', architecture: 'x86_64' },
        });
        await ingestHostDoc(esClient, {
          '@timestamp': '2026-02-25T10:05:00Z',
          host: { entity: { id: 'host-entity-a' }, name: 'name-a2', architecture: 'aarch64' },
        });
        await ingestHostDoc(esClient, {
          '@timestamp': '2026-02-25T10:10:00Z',
          host: { entity: { id: 'host-entity-a' }, name: 'name-a3', architecture: 'arm64' },
        });

        // Entity B: host.id
        await ingestHostDoc(esClient, {
          '@timestamp': '2026-02-25T10:15:00Z',
          host: { id: 'host-id-b', name: 'server-b' },
        });

        // Entity C: host.name only (no domain)
        await ingestHostDoc(esClient, {
          '@timestamp': '2026-02-25T10:20:00Z',
          host: { name: 'server-c' },
        });

        // Entity D: host.name + host.domain
        await ingestHostDoc(esClient, {
          '@timestamp': '2026-02-25T10:25:00Z',
          host: { name: 'server-d', domain: 'example.com', hostname: 'server-d' },
        });

        const extractResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_CCS_EXTRACT_TO_UPDATES('host'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              indexPatterns: [CCS_TEST_HOST_LOGS_INDEX],
              fromDateISO: FROM_DATE,
              toDateISO: TO_DATE,
              docsLimit: 1000,
            },
          }
        );
        expect(extractResponse.statusCode).toBe(200);
        expect(extractResponse.body).toMatchObject({ count: 4, pages: 1 });

        await esClient.indices.refresh({ index: UPDATES_INDEX });

        const searchResponse = await esClient.search({
          index: UPDATES_INDEX,
          size: 10,
          query: {
            range: {
              '@timestamp': {
                gte: TO_DATE,
                lt: MAX_DATE_OF_UPDATES,
              },
            },
          },
        });

        const hits = searchResponse.hits.hits as Array<{ _source: Record<string, unknown> }>;
        expect(hits).toHaveLength(4);

        const byId = Object.fromEntries(
          hits.map((h) => [
            (h._source as Record<string, unknown>)['entity.EngineMetadata.UntypedId'] as string,
            h._source,
          ])
        );

        // Entity A: prefer_newest_value (entity.name from host.name) = last value
        const entityA = byId['host:host-entity-a'] as Record<string, unknown>;
        expect(entityA).toBeDefined();
        expect(entityA['entity.name']).toBe('name-a3');

        // Entity A: collect_values (host.architecture) = multiple values, deduped
        const hostArchitectureA = entityA['host.architecture'];
        expect(Array.isArray(hostArchitectureA)).toBe(true);
        expect((hostArchitectureA as string[]).sort()).toStrictEqual([
          'aarch64',
          'arm64',
          'x86_64',
        ]);

        // Entity B
        const entityB = byId['host:host-id-b'] as Record<string, unknown>;
        expect(entityB).toBeDefined();
        expect(entityB['entity.name']).toBe('server-b');

        // Entity C
        const entityC = byId['host:server-c'] as Record<string, unknown>;
        expect(entityC).toBeDefined();
        expect(entityC['entity.name']).toBe('server-c');

        // Entity D
        const entityD = byId['host:server-d.example.com'] as Record<string, unknown>;
        expect(entityD).toBeDefined();
        expect(entityD['entity.name']).toBe('server-d');
      }
    );
  }
);
