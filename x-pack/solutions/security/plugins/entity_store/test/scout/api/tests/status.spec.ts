/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '@kbn/scout-security';
import { PUBLIC_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import {
  getStatus,
  installAllEntityTypes,
  stopAllEntityTypes,
  stopEntityTypes,
  uninstallAllEntityTypes,
} from '../fixtures/helpers';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
  LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT,
  LOG_EXTRACTION_FREQUENCY_DEFAULT,
  DEFAULT_LOG_EXTRACTION_OVERRIDES,
} from '../../../../server/domain/saved_objects';

const ALL_ENTITY_TYPES = ['generic', 'host', 'service', 'user'];

apiTest.describe('Entity Store Status API tests', { tag: ENTITY_STORE_TAGS }, () => {
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

  apiTest(
    'Should return status "running" with all 4 engine types "started" after a full install',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.statusCode).toBe(200);
      expect(status.body.status).toBe('running');

      const engineTypes = status.body.engines.map((e) => e.type).sort();
      expect(engineTypes).toStrictEqual(ALL_ENTITY_TYPES);

      for (const engine of status.body.engines) {
        expect(engine.status).toBe('started');
        expect(engine.maxLogsPerWindow).toBe(LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT);
        expect(engine.maxLogsPerWindowCapBehavior).toBe(LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT);

        // effective per-type cadence: the type's default override when set (#269261),
        // otherwise the shared global default
        const expectedFrequency =
          DEFAULT_LOG_EXTRACTION_OVERRIDES[engine.type].frequency ??
          LOG_EXTRACTION_FREQUENCY_DEFAULT;
        expect(engine.frequency).toBe(expectedFrequency);
      }
    }
  );

  apiTest(
    'Should reflect a per-type cadence override set via update/{entityType}',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE_BY_TYPE('user'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '15m', delay: '3m', lookbackPeriod: '6h' } },
      });
      expect(update.statusCode).toBe(200);

      const status = await getStatus(apiClient, defaultHeaders);
      const userEngine = status.body.engines.find((e) => e.type === 'user');
      expect(userEngine?.frequency).toBe('15m');
      expect(userEngine?.delay).toBe('3m');
      expect(userEngine?.lookbackPeriod).toBe('6h');

      // other types keep their own (unrelated) effective cadence
      const hostEngine = status.body.engines.find((e) => e.type === 'host');
      expect(hostEngine?.frequency).toBe(LOG_EXTRACTION_FREQUENCY_DEFAULT);
      const serviceEngine = status.body.engines.find((e) => e.type === 'service');
      expect(serviceEngine?.frequency).toBe(DEFAULT_LOG_EXTRACTION_OVERRIDES.service.frequency);
    }
  );

  apiTest(
    'Should reject an explicit null cadence value and leave the override unchanged',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE_BY_TYPE('service'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: null } },
      });
      expect(update.statusCode).toBe(400);

      const status = await getStatus(apiClient, defaultHeaders);
      const serviceEngine = status.body.engines.find((e) => e.type === 'service');
      // the null was rejected — service keeps its own built-in default, not the global one
      expect(serviceEngine?.frequency).toBe(DEFAULT_LOG_EXTRACTION_OVERRIDES.service.frequency);
    }
  );

  apiTest(
    'Should return status "not_installed" and an empty engines array when the store is uninstalled',
    async ({ apiClient }) => {
      await uninstallAllEntityTypes(apiClient, defaultHeaders);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.statusCode).toBe(200);
      expect(status.body.status).toBe('not_installed');
      expect(status.body.engines).toStrictEqual([]);
    }
  );

  apiTest(
    'Should return overall status "running" when 3 engines are "started" and 1 is "stopped"',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);
      await stopEntityTypes(apiClient, defaultHeaders, ['user']);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.status).toBe('running');

      const userEngine = status.body.engines.find((e) => e.type === 'user');
      expect(userEngine!.status).toBe('stopped');

      const otherEngines = status.body.engines.filter((e) => e.type !== 'user');
      for (const engine of otherEngines) {
        expect(engine.status).toBe('started');
      }
    }
  );

  apiTest(
    'Should return overall status "stopped" when all 4 engines are stopped',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);
      await stopAllEntityTypes(apiClient, defaultHeaders);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.status).toBe('stopped');

      for (const engine of status.body.engines) {
        expect(engine.status).toBe('stopped');
      }
    }
  );
});
