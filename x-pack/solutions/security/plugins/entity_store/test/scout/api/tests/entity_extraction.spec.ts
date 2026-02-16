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
    expect(response.statusCode).toBe(200);

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

  apiTest('Should extract properly generate euid for host', async ({ apiClient, esClient }) => {
    const expectedResultCount = 22;

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
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(expectedResultCount);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedHostEntities);
  });

  apiTest('Should extract properly generate euid for user', async ({ apiClient, esClient }) => {
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
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(20);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedUserEntities);
  });

  apiTest('Should extract properly generate euid for service', async ({ apiClient, esClient }) => {
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
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(2);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedServiceEntities);
  });

  apiTest('Should extract properly generate euid for generic', async ({ apiClient, esClient }) => {
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
      size: 1000, // a lot just to be sure we are not capping it
    });

    expect(entities.hits.hits).toHaveLength(1);
    // it's deterministic because of the MD5 id
    // manually checking object until we have a snapshot matcher
    expect(entities.hits.hits).toMatchObject(expectedGenericEntities);
  });

  apiTest('Should properly overwrite values with newest list', async ({ apiClient, esClient }) => {
    const ingestDoc = async (body: any) => {
      return await esClient.index({
        index: '.entities.v2.updates.security_default',
        refresh: 'wait_for',
        body,
      });
    };

    const searchDoc = async (id: string) => {
      await esClient.indices.refresh({ index: '.entities.v2.latest.security_default' });
      return await esClient.search({
        index: '.entities.v2.latest.security_default',
        query: {
          bool: {
            filter: {
              term: { 'entity.id': id },
            },
          },
        },
        size: 2,
      });
    };

    const forceUserExtraction = async (fromDateISO: string, toDateISO: string) => {
      return await apiClient.post(ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION('user'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: { fromDateISO, toDateISO },
      });
    };

    // Ingest a document without watchlists
    await ingestDoc({
      '@timestamp': '2026-02-13T11:00:00Z',
      user: {
        id: 'watchlist-test',
        name: 'watchlist-test-name',
      },
    });

    const firstExtractionResponse = await forceUserExtraction(
      '2026-02-13T10:59:00Z',
      '2026-02-13T11:01:00Z'
    );
    expect(firstExtractionResponse.statusCode).toBe(200);
    expect(firstExtractionResponse.body.count).toBe(1);

    const beforeWatchList = await searchDoc('user:watchlist-test');
    expect(beforeWatchList.hits.hits).toHaveLength(1);
    expect(beforeWatchList.hits.hits[0]._source).toMatchObject({
      'entity.id': 'user:watchlist-test',
      'entity.type': 'Identity',
      'entity.name': 'watchlist-test-name',
    });

    // Add watchlists to the document
    await ingestDoc({
      '@timestamp': '2026-02-13T11:01:00Z',
      user: {
        id: 'watchlist-test',
        entity: {
          attributes: {
            Watchlists: ['w1', 'w2', 'w3'],
          },
        },
      },
    });

    const secondExtractionResponse = await forceUserExtraction(
      '2026-02-13T11:00:00Z',
      '2026-02-13T11:02:00Z'
    );
    expect(secondExtractionResponse.statusCode).toBe(200);
    expect(secondExtractionResponse.body.count).toBe(1);

    const afterWatchList = await searchDoc('user:watchlist-test');
    expect(afterWatchList.hits.hits).toHaveLength(1);
    expect(afterWatchList.hits.hits[0]._source).toMatchObject({
      'entity.id': 'user:watchlist-test',
      'entity.type': 'Identity',
      'entity.name': 'watchlist-test-name',
      'entity.attributes.Watchlists': ['w1', 'w2', 'w3'],
    });

    // Delete a watchlist from the document
    // Add watchlists to the document
    await ingestDoc({
      '@timestamp': '2026-02-13T11:02:00Z',
      user: {
        id: 'watchlist-test',
        entity: {
          attributes: {
            Watchlists: ['w1', 'w3'],
          },
        },
      },
    });

    // Document with data beforfe that should be ignored
    await ingestDoc({
      '@timestamp': '2026-02-13T11:01:59Z',
      user: {
        id: 'watchlist-test',
        entity: {
          attributes: {
            Watchlists: ['should', 'be', 'ignored'],
          },
        },
      },
    });

    const thirdExtractionResponse = await forceUserExtraction(
      '2026-02-13T11:01:00Z',
      '2026-02-13T11:03:00Z'
    );
    expect(thirdExtractionResponse.statusCode).toBe(200);
    expect(thirdExtractionResponse.body.count).toBe(1);

    const updatedWatchList = await searchDoc('user:watchlist-test');
    expect(updatedWatchList.hits.hits).toHaveLength(1);
    expect(updatedWatchList.hits.hits[0]._source).toMatchObject({
      'entity.id': 'user:watchlist-test',
      'entity.type': 'Identity',
      'entity.name': 'watchlist-test-name',
      'entity.attributes.Watchlists': ['w1', 'w3'],
    });

    // Make sure watchlist is not overwritten from the document if not changed
    await ingestDoc({
      '@timestamp': '2026-02-13T11:03:00Z',
      user: {
        id: 'watchlist-test',
        domain: 'example.com',
      },
    });

    const fourthExtractionResponse = await forceUserExtraction(
      '2026-02-13T11:02:00Z',
      '2026-02-13T11:04:00Z'
    );
    expect(fourthExtractionResponse.statusCode).toBe(200);
    expect(fourthExtractionResponse.body.count).toBe(1);

    const updatedDomain = await searchDoc('user:watchlist-test');
    expect(updatedDomain.hits.hits).toHaveLength(1);
    expect(updatedDomain.hits.hits[0]._source).toMatchObject({
      'entity.id': 'user:watchlist-test',
      'entity.type': 'Identity',
      'entity.name': 'watchlist-test-name',
      'entity.attributes.Watchlists': ['w1', 'w3'],
      'user.domain': 'example.com',
    });
  });
});
