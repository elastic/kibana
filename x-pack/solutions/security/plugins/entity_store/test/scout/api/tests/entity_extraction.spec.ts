/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { COMMON_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  expectedGenericEntities,
  expectedHostEntities,
  expectedServiceEntities,
  expectedUserEntities,
} from '../fixtures/entity_extraction_expected';
import { forceLogExtraction, ingestDoc, searchDocById } from '../fixtures/helpers';

apiTest.describe('Entity Store Logs Extraction', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esArchiver, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };

    // enable feature flag
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    // Install the entity store
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

  apiTest('Should extract properly extract host', async ({ apiClient, esClient }) => {
    const expectedResultCount = 19;

    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('host'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(expectedResultCount);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'host' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(expectedResultCount);
    // it's deterministic because of the MD5 id;
    expect(entities.hits.hits).toMatchObject(expectedHostEntities);
  });

  apiTest('Should extract properly extract user', async ({ apiClient, esClient }) => {
    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(20);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'user' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(20);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedUserEntities);
  });

  apiTest('Should extract properly extract service', async ({ apiClient, esClient }) => {
    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('service'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(2);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'service' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(2);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedServiceEntities);
  });

  apiTest('Should extract properly extract generic', async ({ apiClient, esClient }) => {
    const extractionResponse = await apiClient.post(
      ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('generic'),
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          fromDateISO: '2026-01-20T11:00:00Z',
          toDateISO: '2026-01-20T13:00:00Z',
        },
      }
    );
    expect(extractionResponse.statusCode).toBe(200);
    expect(extractionResponse.body.success).toBe(true);
    expect(extractionResponse.body.pages).toBe(1);
    expect(extractionResponse.body.count).toBe(1);

    const entities = await esClient.search({
      index: '.entities.v2.latest.security_default',
      query: {
        bool: {
          filter: {
            term: { 'entity.EngineMetadata.Type': 'generic' },
          },
        },
      },
      sort: '@timestamp:asc,entity.id:asc',
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(1);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedGenericEntities);
  });

  apiTest('Should properly handle field retention strategies', async ({ apiClient, esClient }) => {
    // Ingest a document without sub_type
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:00:00Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        name: 'latest-test-name',
      },
    });

    const firstExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T10:59:00Z',
      '2026-02-13T11:01:00Z'
    );
    expect(firstExtractionResponse.statusCode).toBe(200);
    expect(firstExtractionResponse.body).toMatchObject({ count: 1 });

    const beforeSubType = await searchDocById(esClient, 'user:latest-test@okta');

    expect(beforeSubType.hits.hits).toHaveLength(1);
    expect(beforeSubType.hits.hits[0]._version).toBe(1);
    expect(beforeSubType.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:00:00.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
      },
    });

    // Add sub_type to the document
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:01:00Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-1', 'hash-2'],
        entity: {
          sub_type: 'Sub Type 1',
        },
      },
    });

    const secondExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T11:00:00Z',
      '2026-02-13T11:02:00Z'
    );
    expect(secondExtractionResponse.statusCode).toBe(200);
    expect(secondExtractionResponse.body).toMatchObject({ count: 1 });

    const afterSubType = await searchDocById(esClient, 'user:latest-test@okta');
    expect(afterSubType.hits.hits).toHaveLength(1);
    expect(afterSubType.hits.hits[0]._version).toBe(2);
    expect(afterSubType.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:01:00.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
        sub_type: 'Sub Type 1',
      },
      user: { hash: ['hash-1', 'hash-2'] },
    });

    // Update sub_type in between documents with null values
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:01Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        entity: {
          sub_type: 'Sub Type 2',
        },
      },
    });

    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:02Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-3', 'hash-4'],
        entity: {
          // no sub_type
        },
      },
    });

    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:03Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-1', 'hash-3'], // add duplicated hashes
        entity: {
          sub_type: 'Sub Type 3',
        },
      },
    });

    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:02:04Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        hash: ['hash-5'],
        entity: {
          // no sub_type
        },
      },
    });

    const thirdExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T11:01:00Z',
      '2026-02-13T11:03:00Z'
    );
    expect(thirdExtractionResponse.statusCode).toBe(200);
    expect(thirdExtractionResponse.body).toMatchObject({ count: 1 });

    const updatedSubType = await searchDocById(esClient, 'user:latest-test@okta');
    expect(updatedSubType.hits.hits).toHaveLength(1);
    expect(updatedSubType.hits.hits[0]._version).toBe(3);
    expect(updatedSubType.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:02:04.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
        sub_type: 'Sub Type 3',
      },
      user: { hash: ['hash-1', 'hash-3', 'hash-4', 'hash-5', 'hash-2'] },
    });

    // Make sure latest is not overwritten from the document if not changed
    await ingestDoc(esClient, {
      '@timestamp': '2026-02-13T11:03:00Z',
      event: { kind: 'asset', module: 'okta' },
      user: {
        id: 'latest-test',
        domain: 'example.com',
        hash: ['hash-6', 'hash-7', 'hash-8', 'hash-9', 'hash-10', 'hash-11'],
      },
    });

    const fourthExtractionResponse = await forceLogExtraction(
      apiClient,
      defaultHeaders,
      'user',
      '2026-02-13T11:02:00Z',
      '2026-02-13T11:04:00Z'
    );
    expect(fourthExtractionResponse.statusCode).toBe(200);
    expect(fourthExtractionResponse.body).toMatchObject({ count: 1 });

    const updatedLatestDomain = await searchDocById(esClient, 'user:latest-test@okta');
    expect(updatedLatestDomain.hits.hits).toHaveLength(1);
    expect(updatedLatestDomain.hits.hits[0]._version).toBe(4);
    expect(updatedLatestDomain.hits.hits[0]._source).toMatchObject({
      '@timestamp': '2026-02-13T11:03:00.000Z',
      entity: {
        id: 'user:latest-test@okta',
        type: 'Identity',
        name: 'latest-test-name',
        sub_type: 'Sub Type 3',
      },
      user: {
        hash: [
          'hash-1',
          'hash-10',
          'hash-11',
          'hash-3',
          'hash-4',
          'hash-5',
          'hash-6',
          'hash-7',
          'hash-8',
          'hash-2',
        ],
        domain: 'example.com',
      },
    });
  });

  apiTest(
    'Should store _source as nested objects after ingest pipeline',
    async ({ apiClient, esClient }) => {
      const extractionResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('host'),
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            fromDateISO: '2026-01-20T11:00:00Z',
            toDateISO: '2026-01-20T13:00:00Z',
          },
        }
      );
      expect(extractionResponse.statusCode).toBe(200);
      expect(extractionResponse.body.success).toBe(true);

      const entities = await esClient.search({
        index: '.entities.v2.latest.security_default',
        query: { bool: { filter: { term: { 'entity.EngineMetadata.Type': 'host' } } } },
        size: 5,
      });

      expect(entities.hits.hits.length).toBeGreaterThan(0);
      for (const hit of entities.hits.hits) {
        const source = hit._source as Record<string, unknown>;
        expect(source).toBeDefined();
        expect(source.entity).toBeDefined();
        expect(typeof source.entity).toBe('object');
        const topLevelKeys = Object.keys(source);
        const dottedKeys = topLevelKeys.filter((k) => k.includes('.'));
        expect(dottedKeys).toHaveLength(0);
      }
    }
  );
});
