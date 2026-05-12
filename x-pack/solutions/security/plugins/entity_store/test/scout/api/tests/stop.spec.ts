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
  stopAllEntityTypes,
  stopEntityTypes,
  uninstallAllEntityTypes,
} from '../fixtures/helpers';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

const ALL_ENTITY_TYPES = ['generic', 'host', 'service', 'user'];

// Failing: See https://github.com/elastic/kibana/issues/264303
apiTest.describe.skip('Entity Store Stop API tests', { tag: ENTITY_STORE_TAGS }, () => {
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

  apiTest('Should stop all engines when entityTypes is omitted', async ({ apiClient }) => {
    await installAllEntityTypes(apiClient, defaultHeaders);

    const stopResponse = await stopAllEntityTypes(apiClient, defaultHeaders);
    expect(stopResponse.statusCode).toBe(200);

    const status = await getStatus(apiClient, defaultHeaders);
    expect(status.body.status).toBe('stopped');

    const engineTypes = status.body.engines.map((e) => e.type).sort();
    expect(engineTypes).toStrictEqual(ALL_ENTITY_TYPES);

    for (const engine of status.body.engines) {
      expect(engine.status).toBe('stopped');
    }
  });

  apiTest('Should stop a single entity type', async ({ apiClient }) => {
    await installAllEntityTypes(apiClient, defaultHeaders);

    const stopResponse = await stopEntityTypes(apiClient, defaultHeaders, ['user']);
    expect(stopResponse.statusCode).toBe(200);
    expect(stopResponse.body).toStrictEqual({ ok: true });

    const status = await getStatus(apiClient, defaultHeaders);

    // Overall status stays running when other engines are still active
    expect(status.body.status).toBe('running');

    const userEngine = status.body.engines.find((e) => e.type === 'user');
    expect(userEngine!.status).toBe('stopped');

    const otherEngines = status.body.engines.filter((e) => e.type !== 'user');
    for (const engine of otherEngines) {
      expect(engine.status).toBe('started');
    }
  });

  apiTest(
    'Should return 200 when stopping an entity type that is already stopped',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      await stopEntityTypes(apiClient, defaultHeaders, ['user']);

      // Stop user engine again
      const secondStopResponse = await stopEntityTypes(apiClient, defaultHeaders, ['user']);
      expect(secondStopResponse.statusCode).toBe(200);
      expect(secondStopResponse.body).toStrictEqual({ ok: true });

      const status = await getStatus(apiClient, defaultHeaders);

      const userEngine = status.body.engines.find((e) => e.type === 'user');
      expect(userEngine!.status).toBe('stopped');
    }
  );

  apiTest('Should return 200 when stopping on an uninstalled store', async ({ apiClient }) => {
    await uninstallAllEntityTypes(apiClient, defaultHeaders);

    const stopResponse = await stopEntityTypes(apiClient, defaultHeaders, ['user']);
    expect(stopResponse.statusCode).toBe(200);
    expect(stopResponse.body).toStrictEqual({ ok: true });

    const status = await getStatus(apiClient, defaultHeaders);
    expect(status.body.status).toBe('not_installed');
  });
});
