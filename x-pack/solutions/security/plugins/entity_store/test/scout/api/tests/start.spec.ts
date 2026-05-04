/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '@kbn/scout-security';
import { PUBLIC_HEADERS, ENTITY_STORE_TAGS } from '../fixtures/constants';
import {
  getStatus,
  installAllEntityTypes,
  startAllEntityTypes,
  startEntityTypes,
  stopAllEntityTypes,
  stopEntityTypes,
  uninstallAllEntityTypes,
} from '../fixtures/helpers';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

const ALL_ENTITY_TYPES = ['generic', 'host', 'service', 'user'];

apiTest.describe('Entity Store Start API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await uninstallAllEntityTypes(apiClient, defaultHeaders);
  });

  apiTest('Should start all engines after stop', async ({ apiClient }) => {
    await installAllEntityTypes(apiClient, defaultHeaders);
    await stopAllEntityTypes(apiClient, defaultHeaders);

    const startResponse = await startAllEntityTypes(apiClient, defaultHeaders);
    expect(startResponse.statusCode).toBe(200);

    const status = await getStatus(apiClient, defaultHeaders);
    expect(status.body.status).toBe('running');

    const engineTypes = status.body.engines.map((e) => e.type).sort();
    expect(engineTypes).toStrictEqual(ALL_ENTITY_TYPES);

    for (const engine of status.body.engines) {
      expect(engine.status).toBe('started');
    }
  });

  apiTest('Should start a single stopped entity type', async ({ apiClient }) => {
    await installAllEntityTypes(apiClient, defaultHeaders);
    await stopEntityTypes(apiClient, defaultHeaders, ['user']);

    const startResponse = await startEntityTypes(apiClient, defaultHeaders, ['user']);
    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.body).toStrictEqual({ ok: true });

    const status = await getStatus(apiClient, defaultHeaders);
    expect(status.body.status).toBe('running');

    for (const engine of status.body.engines) {
      expect(engine.status).toBe('started');
    }
  });

  apiTest(
    'Should return 200 when starting an entity type that is already started',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const startResponse = await startEntityTypes(apiClient, defaultHeaders, ['user']);
      expect(startResponse.statusCode).toBe(200);
      expect(startResponse.body).toStrictEqual({ ok: true });

      const status = await getStatus(apiClient, defaultHeaders);

      const userEngine = status.body.engines.find((e) => e.type === 'user');
      expect(userEngine!.status).toBe('started');
    }
  );

  apiTest('Should return 200 when starting on an uninstalled store', async ({ apiClient }) => {
    await uninstallAllEntityTypes(apiClient, defaultHeaders);

    const startResponse = await startEntityTypes(apiClient, defaultHeaders, ['user']);
    expect(startResponse.statusCode).toBe(200);
    expect(startResponse.body).toStrictEqual({ ok: true });

    const status = await getStatus(apiClient, defaultHeaders);
    expect(status.body.status).toBe('not_installed');
  });
});
