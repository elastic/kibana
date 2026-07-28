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
  LATEST_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { assertEntitiesEqual, expectedHostEntities } from '../fixtures/entity_extraction_expected';
import { clearEntityStoreIndices } from '../fixtures/helpers';

// Verifies the extraction task heals itself: if the shared latest index is deleted out from
// under a running engine, an extraction run recreates it and still succeeds.
apiTest.describe('Entity Store extraction self-heal', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, esArchiver, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

    // Pre-create the `security-solution-default` data view so extraction takes its `logs-*` path
    // (the browser sourcerer flow that normally creates it never runs in API-only tests).
    const dataViewResponse = await apiClient.post('/api/data_views/data_view', {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        override: true,
        data_view: {
          id: 'security-solution-default',
          name: 'security-solution-default',
          title: 'logs-*',
          timeFieldName: '@timestamp',
        },
      },
    });
    expect(dataViewResponse.statusCode).toBe(200);

    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
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
    'recreates the latest index and still extracts after it is deleted',
    async ({ apiClient, esClient, log }) => {
      // Confirm the index exists, then delete it to simulate the failure state.
      expect(await esClient.indices.exists({ index: LATEST_INDEX })).toBe(true);
      await esClient.indices.delete({ index: LATEST_INDEX });
      expect(await esClient.indices.exists({ index: LATEST_INDEX })).toBe(false);

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
      expect(extractionResponse.body.count).toBe(expectedHostEntities.length);

      // The index was recreated by the self-heal.
      expect(await esClient.indices.exists({ index: LATEST_INDEX })).toBe(true);

      // And the entities were re-extracted into it.
      const entities = await esClient.search({
        index: LATEST_ALIAS,
        query: { bool: { filter: { term: { 'entity.EngineMetadata.Type': 'host' } } } },
        size: 1000,
      });
      assertEntitiesEqual(expectedHostEntities, entities.hits.hits, (msg) => log.error(msg));
    }
  );
});
