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

apiTest.describe('Entity Store install / update API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };
  });

  apiTest(
    'Should install the entity store happy path with feature flag enabled',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      const install = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(install.statusCode).toBe(201);

      const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(uninstall.statusCode).toBe(200);
    }
  );

  apiTest('Should fail with feature flag disabled', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: false,
    });

    const install = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(403);
  });

  apiTest('logExtraction is not mandatory on install', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    const install = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(201);

    await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest('logExtraction is mandatory on update', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(update.statusCode).toBe(400);

    await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'Update should change installed logExtraction params',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '2m' } },
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '5m' } },
      });
      expect(update.statusCode).toBe(200);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(status.statusCode).toBe(200);
      const engines = (status.body as { engines: Array<{ delay: string }> }).engines;
      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].delay).toBe('5m');

      await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'Update should not change logExtraction properties that were not included in the update',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '2m', frequency: '1m' } },
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '5m' } },
      });
      expect(update.statusCode).toBe(200);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(status.statusCode).toBe(200);
      const engines = (status.body as { engines: Array<{ delay: string; frequency: string }> })
        .engines;
      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].delay).toBe('5m');
      expect(engines[0].frequency).toBe('1m');

      await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );
});
