/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import { get } from 'lodash';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

const DOCS_LIMIT = 2;
const CCS_TEST_HOST_LOGS_INDEX = 'ccs-test-host-logs';
const CCS_TEST_USER_LOGS_INDEX = 'ccs-test-user-logs';
const CCS_TEST_SERVICE_LOGS_INDEX = 'ccs-test-service-logs';
const CCS_TEST_GENERIC_LOGS_INDEX = 'ccs-test-generic-logs';
const FROM_DATE = '2026-02-25T10:00:00Z';
const TO_DATE = '2026-02-25T12:00:00Z';
const MAX_DATE_OF_UPDATES = '2026-02-25T12:10:01Z';

const CCS_TEST_INDICES = [
  CCS_TEST_HOST_LOGS_INDEX,
  CCS_TEST_USER_LOGS_INDEX,
  CCS_TEST_SERVICE_LOGS_INDEX,
  CCS_TEST_GENERIC_LOGS_INDEX,
];

async function createCcsTestHostLogsIndex(esClient: EsClient) {
  await esClient.indices.create({
    index: CCS_TEST_HOST_LOGS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        host: {
          properties: {
            entity: {
              properties: {
                id: { type: 'keyword' },
                sub_type: { type: 'keyword' },
              },
            },
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

async function createCcsTestUserLogsIndex(esClient: EsClient) {
  await esClient.indices.create({
    index: CCS_TEST_USER_LOGS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        user: {
          properties: {
            name: { type: 'keyword' },
            id: { type: 'keyword' },
            email: { type: 'keyword' },
          },
        },
        event: {
          properties: {
            kind: { type: 'keyword' },
            category: { type: 'keyword' },
            type: { type: 'keyword' },
            module: { type: 'keyword' },
          },
        },
      },
    },
  });
}

async function createCcsTestServiceLogsIndex(esClient: EsClient) {
  await esClient.indices.create({
    index: CCS_TEST_SERVICE_LOGS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        service: {
          properties: {
            name: { type: 'keyword' },
            version: { type: 'keyword' },
          },
        },
      },
    },
  });
}

async function createCcsTestGenericLogsIndex(esClient: EsClient) {
  await esClient.indices.create({
    index: CCS_TEST_GENERIC_LOGS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        entity: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'keyword' },
          },
        },
      },
    },
  });
}

async function ingestDoc(
  esClient: EsClient,
  index: string,
  doc: Record<string, unknown> & { '@timestamp': string }
) {
  await esClient.index({
    index,
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
        body: {
          logExtraction: {
            docsLimit: DOCS_LIMIT,
          },
        },
      });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await Promise.all(
        CCS_TEST_INDICES.map(async (index) => {
          await esClient.indices.delete({ index }, { ignore: [404] });
        })
      );

      await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          logExtraction: {
            docsLimit: DOCS_LIMIT,
          },
        },
      });
    });

    apiTest(
      'Should run CCS extraction for host and write to updates then latest index',
      async ({ apiClient, esClient }) => {
        await createCcsTestHostLogsIndex(esClient);

        await ingestDoc(esClient, CCS_TEST_HOST_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:00:01Z',
          host: { name: 'name-a1', architecture: 'x86_64', entity: { sub_type: 'bare-metal' } },
        });
        await ingestDoc(esClient, CCS_TEST_HOST_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:05:00Z',
          host: { name: 'name-a1', architecture: 'aarch64', entity: { sub_type: 'vm' } },
        });
        await ingestDoc(esClient, CCS_TEST_HOST_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:10:00Z',
          host: { name: 'name-a1', architecture: 'arm64', entity: { sub_type: 'container' } },
        });
        await ingestDoc(esClient, CCS_TEST_HOST_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:15:00Z',
          host: { id: 'host-id-b', name: 'server-b' },
        });
        await ingestDoc(esClient, CCS_TEST_HOST_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:20:00Z',
          host: { hostname: 'server-c' },
        });
        await ingestDoc(esClient, CCS_TEST_HOST_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:25:00Z',
          host: { name: 'server-d', domain: 'example.com', hostname: 'server-d-hostname' },
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
              docsLimit: DOCS_LIMIT,
            },
          }
        );
        expect(extractResponse.statusCode).toBe(200);
        expect(extractResponse.body).toMatchObject({ count: 4, pages: 2 });

        const logExtractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('host'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              fromDateISO: TO_DATE,
              toDateISO: MAX_DATE_OF_UPDATES,
            },
          }
        );
        expect(logExtractionResponse.statusCode).toBe(200);
        expect(logExtractionResponse.body.success).toBe(true);

        await esClient.indices.refresh({ index: LATEST_INDEX });

        const latestSearchResponse = await esClient.search({
          index: LATEST_INDEX,
          size: 100,
          query: {
            bool: {
              filter: [
                { term: { 'entity.EngineMetadata.Type': 'host' } },
                {
                  terms: {
                    'entity.id': [
                      'host:name-a1',
                      'host:host-id-b',
                      'host:server-c',
                      'host:server-d',
                    ],
                  },
                },
              ],
            },
          },
        });

        const latestHits = latestSearchResponse.hits.hits as Array<{
          _source: Record<string, unknown>;
        }>;
        expect(latestHits).toHaveLength(4);

        const byId = Object.fromEntries(
          latestHits.map((h) => [get(h._source, ['entity', 'id']), h._source])
        );

        const entityA = byId['host:name-a1'] as Record<string, unknown>;
        expect(entityA).toBeDefined();
        expect(get(entityA, ['entity', 'name'])).toBe('name-a1');
        expect(get(entityA, ['entity', 'sub_type'])).toBe('container');

        const hostArchitectureA = get(entityA, ['host', 'architecture']);
        expect(Array.isArray(hostArchitectureA)).toBe(true);
        expect((hostArchitectureA as string[]).sort()).toStrictEqual([
          'aarch64',
          'arm64',
          'x86_64',
        ]);

        const entityB = byId['host:host-id-b'] as Record<string, unknown>;
        expect(entityB).toBeDefined();
        expect(get(entityB, ['entity', 'name'])).toBe('server-b');

        const entityC = byId['host:server-c'] as Record<string, unknown>;
        expect(entityC).toBeDefined();

        const entityD = byId['host:server-d'] as Record<string, unknown>;
        expect(entityD).toBeDefined();
      }
    );

    apiTest(
      'Should run CCS extraction for user and write to updates then latest index',
      async ({ apiClient, esClient }) => {
        await createCcsTestUserLogsIndex(esClient);

        await ingestDoc(esClient, CCS_TEST_USER_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:30:00Z',
          user: { name: 'alice', domain: 'elastic.co' },
          event: { kind: 'asset', module: 'entityanalytics_ad' },
        });
        await ingestDoc(esClient, CCS_TEST_USER_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:35:00Z',
          user: { email: 'bob@email.com', id: 'u2', name: 'bob' },
          event: { kind: 'asset', module: 'aws' },
        });

        // Shared module user
        await ingestDoc(esClient, CCS_TEST_USER_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:35:01Z',
          user: { name: 'romulo.farias' },
          event: { kind: 'asset', module: 'okta' },
        });

        await ingestDoc(esClient, CCS_TEST_USER_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:35:01Z',
          user: { name: 'romulo.farias' },
          event: { kind: 'asset', module: 'entityanalytics_okta' },
        });

        const extractResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_CCS_EXTRACT_TO_UPDATES('user'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              indexPatterns: [CCS_TEST_USER_LOGS_INDEX],
              fromDateISO: FROM_DATE,
              toDateISO: TO_DATE,
              docsLimit: DOCS_LIMIT,
            },
          }
        );
        expect(extractResponse.statusCode).toBe(200);
        expect(extractResponse.body).toMatchObject({ count: 3, pages: 2 });

        const logExtractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              fromDateISO: TO_DATE,
              toDateISO: MAX_DATE_OF_UPDATES,
            },
          }
        );
        expect(logExtractionResponse.statusCode).toBe(200);
        expect(logExtractionResponse.body.success).toBe(true);

        await esClient.indices.refresh({ index: LATEST_INDEX });

        const latestSearchResponse = await esClient.search({
          index: LATEST_INDEX,
          size: 100,
          query: {
            bool: {
              filter: [
                { term: { 'entity.EngineMetadata.Type': 'user' } },
                {
                  terms: {
                    'entity.id': [
                      'user:alice@elastic.co@active_directory',
                      'user:bob@email.com@aws',
                      'user:romulo.farias@okta',
                    ],
                  },
                },
              ],
            },
          },
          sort: 'entity.id:asc',
        });

        expect(latestSearchResponse.hits.hits).toHaveLength(3);
        const hits = latestSearchResponse.hits.hits;
        expect(get(hits[0], ['_source', 'entity', 'id'])).toBe(
          'user:alice@elastic.co@active_directory'
        );
        expect(get(hits[0], ['_source', 'user', 'name'])).toBe('alice');
        expect(get(hits[0], ['_source', 'user', 'domain'])).toBe('elastic.co');
        expect(get(hits[0], ['_source', 'event', 'kind'])).toBe('asset');

        expect(get(hits[1], ['_source', 'entity', 'id'])).toBe('user:bob@email.com@aws');
        expect(get(hits[1], ['_source', 'event', 'kind'])).toBe('asset');

        expect(get(hits[2], ['_source', 'entity', 'id'])).toBe('user:romulo.farias@okta');
        expect(get(hits[2], ['_source', 'user', 'name'])).toBe('romulo.farias');
        expect(get(hits[2], ['_source', 'event', 'module'])).toMatchObject([
          'entityanalytics_okta',
          'okta',
        ]);
        expect(get(hits[2], ['_source', 'event', 'kind'])).toBe('asset');
      }
    );

    apiTest(
      'Should run CCS extraction for service and write to updates then latest index',
      async ({ apiClient, esClient }) => {
        await createCcsTestServiceLogsIndex(esClient);

        await ingestDoc(esClient, CCS_TEST_SERVICE_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:40:00Z',
          service: { name: 'svc-a', version: '1.0' },
        });
        await ingestDoc(esClient, CCS_TEST_SERVICE_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:45:00Z',
          service: { name: 'svc-b' },
        });

        const extractResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_CCS_EXTRACT_TO_UPDATES('service'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              indexPatterns: [CCS_TEST_SERVICE_LOGS_INDEX],
              fromDateISO: FROM_DATE,
              toDateISO: TO_DATE,
              docsLimit: DOCS_LIMIT,
            },
          }
        );
        expect(extractResponse.statusCode).toBe(200);
        expect(extractResponse.body).toMatchObject({ count: 2, pages: 1 });

        const logExtractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('service'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              fromDateISO: TO_DATE,
              toDateISO: MAX_DATE_OF_UPDATES,
            },
          }
        );
        expect(logExtractionResponse.statusCode).toBe(200);
        expect(logExtractionResponse.body.success).toBe(true);

        await esClient.indices.refresh({ index: LATEST_INDEX });

        const latestSearchResponse = await esClient.search({
          index: LATEST_INDEX,
          size: 100,
          query: {
            bool: {
              filter: [
                { term: { 'entity.EngineMetadata.Type': 'service' } },
                {
                  terms: {
                    'entity.id': ['service:svc-a', 'service:svc-b'],
                  },
                },
              ],
            },
          },
          sort: 'entity.id:asc',
        });

        expect(latestSearchResponse.hits.hits).toHaveLength(2);
        const hits = latestSearchResponse.hits.hits;
        expect(get(hits[0], ['_source', 'entity', 'id'])).toBe('service:svc-a');
        expect(get(hits[0], ['_source', 'service', 'name'])).toBe('svc-a');
        expect(get(hits[0], ['_source', 'service', 'version'])).toBe('1.0');

        expect(get(hits[1], ['_source', 'entity', 'id'])).toBe('service:svc-b');
        expect(get(hits[1], ['_source', 'service', 'name'])).toBe('svc-b');
      }
    );

    apiTest(
      'Should run CCS extraction for generic and write to updates then latest index',
      async ({ apiClient, esClient }) => {
        await createCcsTestGenericLogsIndex(esClient);

        await ingestDoc(esClient, CCS_TEST_GENERIC_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:50:00Z',
          entity: { id: 'gen-1', name: 'Generic One' },
        });
        await ingestDoc(esClient, CCS_TEST_GENERIC_LOGS_INDEX, {
          '@timestamp': '2026-02-25T10:55:00Z',
          entity: { id: 'gen-2', name: 'Generic Two' },
        });

        const extractResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_CCS_EXTRACT_TO_UPDATES('generic'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              indexPatterns: [CCS_TEST_GENERIC_LOGS_INDEX],
              fromDateISO: FROM_DATE,
              toDateISO: TO_DATE,
              docsLimit: DOCS_LIMIT,
            },
          }
        );
        expect(extractResponse.statusCode).toBe(200);
        expect(extractResponse.body).toMatchObject({ count: 2, pages: 1 });

        const logExtractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('generic'),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {
              fromDateISO: TO_DATE,
              toDateISO: MAX_DATE_OF_UPDATES,
            },
          }
        );
        expect(logExtractionResponse.statusCode).toBe(200);
        expect(logExtractionResponse.body.success).toBe(true);

        await esClient.indices.refresh({ index: LATEST_INDEX });

        const latestSearchResponse = await esClient.search({
          index: LATEST_INDEX,
          size: 100,
          query: {
            bool: {
              filter: [
                { term: { 'entity.EngineMetadata.Type': 'generic' } },
                {
                  terms: {
                    'entity.id': ['gen-1', 'gen-2'],
                  },
                },
              ],
            },
          },
        });

        expect(latestSearchResponse.hits.hits).toHaveLength(2);
        const hits = latestSearchResponse.hits.hits;
        expect(get(hits[0], ['_source', 'entity', 'id'])).toBe('gen-1');
        expect(get(hits[0], ['_source', 'entity', 'name'])).toBe('Generic One');

        expect(get(hits[1], ['_source', 'entity', 'id'])).toBe('gen-2');
        expect(get(hits[1], ['_source', 'entity', 'name'])).toBe('Generic Two');
      }
    );
  }
);
