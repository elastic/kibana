/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  ENTITY_CONFIDENCE,
  USER_ENTITY_NAMESPACE,
} from '../../../../common/domain/definitions/user_entity_constants';
import {
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  INTERNAL_HEADERS,
  LATEST_ALIAS,
  PUBLIC_HEADERS,
} from '../fixtures/constants';
import { clearEntityStoreIndices } from '../fixtures/helpers';

const BROKEN_MAPPING_DATA_STREAM = 'logs-broken-mapping';
const BROKEN_MAPPING_TEMPLATE = 'logs-broken-mapping-template';
const FROM_DATE = '2026-04-14T10:00:00Z';
const TO_DATE = '2026-04-14T10:06:00Z';

/** Full expected `_source` for each host entity in the latest index (broken mapping → normalized types). */
const EXPECTED_HOST_LATEST_SOURCES = [
  {
    '@timestamp': '2026-04-14T10:01:00.000Z',
    entity: {
      id: 'host:broken-host-1',
      name: 'broken-host-name-1',
      type: 'Host',
      EngineMetadata: { Type: 'host', UntypedId: 'broken-host-1' },
      attributes: { managed: true },
      lifecycle: { last_activity: '2026-04-14T10:01:00.000Z' },
    },
    host: {
      id: 'broken-host-1',
      name: 'broken-host-name-1',
      ip: '192.168.0.1',
      uptime: 100,
    },
  },
  {
    '@timestamp': '2026-04-14T10:05:00.000Z',
    entity: {
      id: 'host:broken-host-2',
      name: 'broken-host-name-2',
      type: 'Host',
      EngineMetadata: { Type: 'host', UntypedId: 'broken-host-2' },
      attributes: { managed: false },
      lifecycle: { last_activity: '2026-04-14T10:05:00.000Z' },
    },
    host: {
      id: 'broken-host-2',
      name: 'broken-host-name-2',
      ip: '192.168.0.2',
      uptime: 200,
    },
  },
] as const;

/**
 * Full expected `_source` for each user entity (IDP + local). IDP path: arrays on collected ECS fields.
 * Local path: `user:{name}@{host.id}@local`.
 */
const EXPECTED_USER_LATEST_SOURCES = [
  {
    '@timestamp': '2026-04-14T10:02:00.000Z',
    entity: {
      id: 'user:broken-idp-1@okta',
      name: 'Broken Idp Name',
      type: 'Identity',
      namespace: 'okta',
      confidence: ENTITY_CONFIDENCE.High,
      EngineMetadata: { Type: 'user' },
    },
    user: {
      id: 'broken-idp-1',
      name: 'Broken Idp Name',
    },
    event: {
      kind: 'asset',
      module: 'okta',
    },
  },
  {
    '@timestamp': '2026-04-14T10:04:00.000Z',
    entity: {
      id: 'user:broken-local-user@broken-user-host-1@local',
      name: 'broken-local-user@broken-ws-99',
      type: 'Identity',
      namespace: USER_ENTITY_NAMESPACE.Local,
      confidence: ENTITY_CONFIDENCE.Medium,
      EngineMetadata: { Type: 'user' },
    },
    user: {
      name: 'broken-local-user',
    },
    host: {
      id: 'broken-user-host-1',
      name: 'broken-ws-99',
    },
    event: {
      kind: 'event',
      category: 'network',
      outcome: 'success',
    },
  },
] as const;

const matchExpectedLatestSources = <T extends { entity: { id: string } }>(
  hits: ReadonlyArray<{ _source?: unknown }>,
  expectedDocuments: readonly T[]
): void => {
  expect(hits).toHaveLength(expectedDocuments.length);

  const sourcesByEntityId = new Map<string, unknown>();
  for (const hit of hits) {
    const source = hit._source;
    expect(source).toBeDefined();
    const entityId = (source as { entity: { id: string } }).entity.id;
    sourcesByEntityId.set(entityId, source);
  }

  for (const expected of expectedDocuments) {
    const entityId = expected.entity.id;
    const actual = sourcesByEntityId.get(entityId);
    expect(actual, `missing latest document for ${entityId}`).toBeDefined();
    expect(actual).toMatchObject(expected);
  }
};

const createBrokenMappingTemplate = async (esClient: EsClient) => {
  await esClient.indices.putIndexTemplate({
    name: BROKEN_MAPPING_TEMPLATE,
    index_patterns: [`${BROKEN_MAPPING_DATA_STREAM}*`],
    data_stream: {},
    template: {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          host: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'text' }, // expected as keyword in entity definition
              ip: { type: 'keyword' }, // expected as ip in entity definition
              uptime: { type: 'text' }, // expected as long in entity definition
              entity: {
                properties: {
                  attributes: {
                    properties: {
                      managed: { type: 'keyword' }, // expected as boolean
                    },
                  },
                  lifecycle: {
                    properties: {
                      last_activity: { type: 'text' }, // expected as date
                    },
                  },
                },
              },
            },
          },
          // User identity + IDP / documentsFilter / namespace evaluation (normally keyword-heavy ECS)
          user: {
            properties: {
              id: { type: 'text' },
              name: { type: 'text' },
              email: { type: 'text' },
              domain: { type: 'text' },
            },
          },
          event: {
            properties: {
              kind: { type: 'text' },
              category: { type: 'text' },
              type: { type: 'text' },
              outcome: { type: 'text' },
              module: { type: 'text' },
            },
          },
          data_stream: {
            properties: {
              dataset: { type: 'text' },
            },
          },
        },
      },
    },
  });
};

const ingestBrokenHostDocs = async (esClient: EsClient) => {
  const bulkResponse = await esClient.bulk({
    refresh: 'wait_for',
    operations: [
      { create: { _index: BROKEN_MAPPING_DATA_STREAM } },
      {
        '@timestamp': '2026-04-14T10:01:00Z',
        host: {
          id: 'broken-host-1',
          name: 'broken-host-name-1',
          ip: '192.168.0.1',
          uptime: '100',
          entity: {
            attributes: {
              managed: 'true',
            },
            lifecycle: {
              last_activity: '2026-04-14T10:01:00Z',
            },
          },
        },
      },
      { create: { _index: BROKEN_MAPPING_DATA_STREAM } },
      {
        '@timestamp': '2026-04-14T10:05:00Z',
        host: {
          id: 'broken-host-2',
          name: 'broken-host-name-2',
          ip: '192.168.0.2',
          uptime: '200',
          entity: {
            attributes: {
              managed: '0',
            },
            lifecycle: {
              last_activity: '2026-04-14T10:05:00Z',
            },
          },
        },
      },
    ],
  });

  expect(bulkResponse.errors).toBe(false);
};

const ingestBrokenUserDocs = async (esClient: EsClient) => {
  const bulkResponse = await esClient.bulk({
    refresh: 'wait_for',
    operations: [
      { create: { _index: BROKEN_MAPPING_DATA_STREAM } },
      {
        '@timestamp': '2026-04-14T10:02:00Z',
        event: { kind: 'asset', module: 'okta' },
        user: { id: 'broken-idp-1', name: 'Broken Idp Name' },
      },
      { create: { _index: BROKEN_MAPPING_DATA_STREAM } },
      {
        '@timestamp': '2026-04-14T10:04:00Z',
        event: { kind: 'event', category: 'network', outcome: 'success' },
        user: { name: 'broken-local-user' },
        host: { id: 'broken-user-host-1', name: 'broken-ws-99' },
      },
    ],
  });

  expect(bulkResponse.errors).toBe(false);
};

/**
 * Remove the test data stream (and its backing indices) and the composable template.
 */
const cleanupBrokenMappingArtifacts = async (esClient: EsClient) => {
  await esClient.indices.deleteDataStream({ name: BROKEN_MAPPING_DATA_STREAM }, { ignore: [404] });
  await esClient.indices.deleteIndexTemplate({ name: BROKEN_MAPPING_TEMPLATE }, { ignore: [404] });
};

apiTest.describe('Entity Store logs extraction broken mapping', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient, esClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(installResponse.statusCode).toBe(201);

    await cleanupBrokenMappingArtifacts(esClient);
    await createBrokenMappingTemplate(esClient);
    await esClient.indices.createDataStream(
      { name: BROKEN_MAPPING_DATA_STREAM },
      { ignore: [400] }
    );
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    await cleanupBrokenMappingArtifacts(esClient);

    const uninstallResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(uninstallResponse.statusCode).toBe(200);

    await clearEntityStoreIndices(esClient);
  });

  apiTest(
    'should extract hosts successfully when source index has conflicting field mappings',
    async ({ apiClient, esClient }) => {
      await ingestBrokenHostDocs(esClient);

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {
            fromDateISO: FROM_DATE,
            toDateISO: TO_DATE,
          },
        }
      );

      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body).toMatchObject({
        success: true,
        count: 2,
        pages: 1,
      });

      await esClient.indices.refresh({ index: LATEST_ALIAS });
      const bothHosts = await esClient.search({
        index: LATEST_ALIAS,
        size: 10,
        query: {
          bool: {
            filter: [
              { term: { 'entity.EngineMetadata.Type': 'host' } },
              {
                terms: {
                  'entity.id': ['host:broken-host-1', 'host:broken-host-2'],
                },
              },
            ],
          },
        },
      });
      matchExpectedLatestSources(bothHosts.hits.hits, EXPECTED_HOST_LATEST_SOURCES);
    }
  );

  apiTest(
    'should extract users successfully when source index has conflicting field mappings (IDP + local id / filters)',
    async ({ apiClient, esClient }) => {
      await ingestBrokenUserDocs(esClient);

      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('user'),
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {
            fromDateISO: FROM_DATE,
            toDateISO: TO_DATE,
          },
        }
      );

      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body).toMatchObject({
        success: true,
        count: 2,
        pages: 1,
      });

      await esClient.indices.refresh({ index: LATEST_ALIAS });
      const bothUsers = await esClient.search({
        index: LATEST_ALIAS,
        size: 10,
        query: {
          bool: {
            filter: [
              { term: { 'entity.EngineMetadata.Type': 'user' } },
              {
                terms: {
                  'entity.id': [
                    'user:broken-idp-1@okta',
                    'user:broken-local-user@broken-user-host-1@local',
                  ],
                },
              },
            ],
          },
        },
      });
      matchExpectedLatestSources(bothUsers.hits.hits, EXPECTED_USER_LATEST_SOURCES);
    }
  );
});
