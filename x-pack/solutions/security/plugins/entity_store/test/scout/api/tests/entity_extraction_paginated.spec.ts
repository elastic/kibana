/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { expectedHostEntities } from '../fixtures/entity_extraction_expected';
import { clearEntityStoreIndices } from '../fixtures/helpers';

// Failing: See https://github.com/elastic/kibana/issues/263067
apiTest.describe.skip(
  'Entity Store Logs Extraction with pagination (entity pages + maxLogsPerPage)',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient, esArchiver, kbnClient }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...PUBLIC_HEADERS,
      };
      internalHeaders = {
        ...credentials.cookieHeader,
        ...INTERNAL_HEADERS,
      };

      // enable feature flag
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      // Install the entity store
      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          logExtraction: {
            docsLimit: 5,
          },
        },
      });
      expect(response.statusCode).toBe(201);

      await esArchiver.loadIfNeeded(
        'x-pack/solutions/security/plugins/entity_store/test/scout/api/es_archives/updates'
      );
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(response.statusCode).toBe(200);
      await clearEntityStoreIndices(esClient);
    });

    apiTest(
      'Should extract host with entity pagination (docsLimit 5, wide log slices)',
      async ({ apiClient, esClient }) => {
        const expectedResultCount = 20;
        const expectedPageCount = 4;

        const extractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
          {
            headers: internalHeaders,
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
        expect(extractionResponse.body.pages).toBe(expectedPageCount);

        const entities = await esClient.search({
          index: LATEST_ALIAS,
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
        // it's deterministic because of the SHA-256 id
        // manually checking object until we have a snapshot matcher
        expect(entities.hits.hits).toMatchObject(expectedHostEntities);
      }
    );

    apiTest(
      'Should run more ESQL pages when maxLogsPerPage narrows log slices',
      async ({ apiClient, esClient }) => {
        // We process some entities twice because they didn't fall in the same logs page
        const expectedProcessedEntities = 24;
        const expectedStoredEntities = 20;
        const minimumPagesWithEntityPaginationOnly = 4;

        const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { logExtraction: { maxLogsPerPage: 2 } },
        });
        expect(update.statusCode).toBe(200);

        await esClient.deleteByQuery({
          index: LATEST_ALIAS,
          refresh: true,
          query: {
            bool: {
              filter: {
                term: { 'entity.EngineMetadata.Type': 'host' },
              },
            },
          },
        });

        const extractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('host'),
          {
            headers: internalHeaders,
            responseType: 'json',
            body: {
              fromDateISO: '2026-01-20T11:00:00Z',
              toDateISO: '2026-01-20T13:00:00Z',
            },
          }
        );
        expect(extractionResponse.statusCode).toBe(200);
        expect(extractionResponse.body.success).toBe(true);
        expect(extractionResponse.body.count).toBe(expectedProcessedEntities);
        expect(extractionResponse.body.pages).toBeGreaterThan(minimumPagesWithEntityPaginationOnly);

        const entities = await esClient.search({
          index: LATEST_ALIAS,
          query: {
            bool: {
              filter: {
                term: { 'entity.EngineMetadata.Type': 'host' },
              },
            },
          },
          sort: '@timestamp:asc,entity.id:asc',
          size: 1000,
        });

        expect(entities.hits.hits).toHaveLength(expectedStoredEntities);
        expect(entities.hits.hits).toMatchObject(expectedHostEntities);
      }
    );
  }
);
