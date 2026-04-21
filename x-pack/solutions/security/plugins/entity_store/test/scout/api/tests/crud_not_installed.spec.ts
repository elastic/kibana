/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

apiTest.describe('Entity Store CRUD API - not installed', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ kbnClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest(
    'Should return 400 when creating an entity without Entity Store installed',
    async ({ apiClient }) => {
      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entity: { id: 'test-id' },
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('not installed');
    }
  );

  apiTest(
    'Should return 400 when updating an entity without Entity Store installed',
    async ({ apiClient }) => {
      const response = await apiClient.put(ENTITY_STORE_ROUTES.public.CRUD_UPDATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entity: { id: 'test-id' },
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('not installed');
    }
  );

  apiTest(
    'Should return 400 when bulk updating entities without Entity Store installed',
    async ({ apiClient }) => {
      const response = await apiClient.put(ENTITY_STORE_ROUTES.public.CRUD_BULK_UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entities: [
            {
              type: 'generic',
              doc: { entity: { id: 'test-id' } },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('not installed');
    }
  );
});
