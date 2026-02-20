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
import { expectedHostEntities } from '../fixtures/entity_extraction_expected';

apiTest.describe(
  'Entity Store Logs Extraction with pagination (max 5 docs per page)',
  { tag: ENTITY_STORE_TAGS },
  () => {
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

    apiTest.afterAll(async ({ apiClient }) => {
      const response = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(response.statusCode).toBe(200);
    });

    apiTest(
      'Should extract properly extract host with pagination',
      async ({ apiClient, esClient }) => {
        const expectedResultCount = 22;
        const expectedPageCount = 5;

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
        expect(extractionResponse.body.pages).toBe(expectedPageCount);

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
        // it's deterministic because of the MD5 id
        // manually checking object until we have a snapshot matcher
        expect(entities.hits.hits).toMatchObject(expectedHostEntities);
      }
    );
  }
);
