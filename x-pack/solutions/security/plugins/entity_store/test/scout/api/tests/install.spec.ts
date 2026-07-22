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
import { FF_ENABLE_ENTITY_STORE_V2, type GetEntityMaintainersResponse } from '../../../../common';

apiTest.describe('Entity Store install API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest(
    'Should install the entity store happy path with feature flag enabled',
    async ({ apiClient }) => {
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(install.statusCode).toBe(201);

      const maintainersResponse = await apiClient.get(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET,
        {
          headers: internalHeaders,
          responseType: 'json',
        }
      );
      expect(maintainersResponse.statusCode).toBe(200);
      const { maintainers } = maintainersResponse.body as GetEntityMaintainersResponse;
      expect(maintainers.length).toBeGreaterThan(0);
      expect(maintainers.every((m) => m.taskStatus === 'started')).toBe(true);

      const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(uninstall.statusCode).toBe(200);
    }
  );

  apiTest('Should fail with feature flag disabled', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: false });

    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(403);
  });

  apiTest('logExtraction is not mandatory on install', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(201);

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'status resolves overridden fields to the user value and the rest to defaults',
    async ({ apiClient }) => {
      // Only `frequency` is overridden; every other field must come back at its default.
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '5m' } },
      });

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(status.statusCode).toBe(200);
      const engines = (status.body as { engines: Array<{ frequency: string; delay: string }> })
        .engines;
      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].frequency).toBe('5m'); // override
      expect(engines[0].delay).toBe('1m'); // resolved default

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest('install rejects unknown body keys', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(install.statusCode).toBe(400);
  });

  apiTest('uninstall rejects unknown body keys', async ({ apiClient }) => {
    const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(uninstall.statusCode).toBe(400);
  });
});
