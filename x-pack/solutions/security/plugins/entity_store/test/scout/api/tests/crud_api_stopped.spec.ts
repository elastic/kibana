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

apiTest.describe(
  'Entity Store CRUD API tests: 503 errors on stopped engine',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, kbnClient, samlAuth }) => {
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

      const entityTypesBody = { entityTypes: ['generic'] };

      const stopResponse = await apiClient.put(ENTITY_STORE_ROUTES.STOP, {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityTypesBody,
      });
      expect(stopResponse.statusCode).toBe(200);
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
      'Should return 503 for bulk upsert when generic engine is stopped',
      async ({ apiClient }) => {
        const bulkBody = {
          entities: [
            {
              type: 'generic',
              doc: {
                entity: {
                  id: 'required-id-1-bulk-stopped',
                },
              },
            },
            {
              type: 'generic',
              doc: {
                entity: {
                  id: 'required-id-2-bulk-stopped',
                },
              },
            },
          ],
        };

        const bulkUpsert = await apiClient.put(ENTITY_STORE_ROUTES.CRUD_UPSERT_BULK, {
          headers: defaultHeaders,
          responseType: 'json',
          body: bulkBody,
        });
        expect(bulkUpsert.statusCode).toBe(503);
      }
    );
  }
);
