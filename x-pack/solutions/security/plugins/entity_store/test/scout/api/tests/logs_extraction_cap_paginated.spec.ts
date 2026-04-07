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
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { expectedUserEntitiesMaxLogsPerCycle } from '../fixtures/entity_extraction_expected';
import { clearEntityStoreIndices } from '../fixtures/helpers';

apiTest.describe(
  'Entity Store user logs extraction with maxLogsPerCycle and pagination',
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

      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          logExtraction: {
            docsLimit: 5,
            maxLogsPerCycle: 17,
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
      'Should cap user extraction at maxLogsPerCycle and paginate with docsLimit',
      async ({ apiClient, esClient }) => {
        const expectedResultCount = 17;
        const expectedPageCount = 4;

        const extractionResponse = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION('user'),
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

        const expectedLastSearchTimestamp =
          expectedUserEntitiesMaxLogsPerCycle[expectedUserEntitiesMaxLogsPerCycle.length - 1]
            ._source['@timestamp'];
        expect(extractionResponse.body.lastSearchTimestamp).toBe(expectedLastSearchTimestamp);

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
          size: 1000,
        });

        expect(entities.hits.hits).toHaveLength(expectedResultCount);
        expect(entities.hits.hits).toMatchObject(expectedUserEntitiesMaxLogsPerCycle);

        for (const hit of entities.hits.hits) {
          const source = hit._source as Record<string, unknown>;
          expect(source.entity).toBeDefined();
          expect((source.entity as Record<string, unknown>).namespace).toBeDefined();
          expect((source.entity as Record<string, unknown>).confidence).toBeDefined();
        }
      }
    );
  }
);
