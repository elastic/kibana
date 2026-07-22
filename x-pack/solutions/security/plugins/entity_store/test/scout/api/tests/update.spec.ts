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

/**
 * Task ID format used by the entity store extract entity task.
 * Must match server/tasks/extract_entity_task.ts getExtractEntityTaskId(entityType, namespace).
 */
const getExtractEntityTaskId = (entityType: string, namespace: string = 'default'): string =>
  `entity_store:v2:extract_entity_task:${entityType}:${namespace}`;

apiTest.describe('Entity Store update API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest('Update on uninstalled store should return 404', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { frequency: '1m' } },
    });
    expect(update.statusCode).toBe(404);
  });

  apiTest('logExtraction is mandatory on update', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(update.statusCode).toBe(400);

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest('update rejects unknown body keys', async ({ apiClient }) => {
    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(update.statusCode).toBe(400);
  });

  apiTest('Update should change installed logExtraction params', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { delay: '2m' } },
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { delay: '5m' } },
    });
    expect(update.statusCode).toBe(200);

    const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(status.statusCode).toBe(200);
    const engines = (status.body as { engines: Array<{ delay: string }> }).engines;
    expect(engines.length).toBeGreaterThan(0);
    expect(engines[0].delay).toBe('5m');

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'Update should not change logExtraction properties that were not included in the update',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '2m', frequency: '2m' } },
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '5m' } },
      });
      expect(update.statusCode).toBe(200);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(status.statusCode).toBe(200);
      const engines = (status.body as { engines: Array<{ delay: string; frequency: string }> })
        .engines;
      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].delay).toBe('5m');
      expect(engines[0].frequency).toBe('2m');

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'Update frequency reschedules the running extract task',
    async ({ apiClient, kbnClient }) => {
      const taskId = getExtractEntityTaskId('host');

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['host'] },
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '22m' } },
      });
      expect(update.statusCode).toBe(200);

      // The task's schedule must converge on the new interval — immediately via the update's
      // reschedule, or on the next run via self-heal. Poll to stay robust to task-claim timing.
      await expect
        .poll(
          async () => {
            const task = await kbnClient.savedObjects.get({ type: 'task', id: taskId });
            return (task.attributes as { schedule?: { interval?: string } })?.schedule?.interval;
          },
          { timeout: 30_000 }
        )
        .toBe('22m');

      // Status and the task schedule agree — no drift between reported config and actual interval.
      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      const engines = (status.body as { engines: Array<{ type: string; frequency: string }> })
        .engines;
      expect(engines.find((e) => e.type === 'host')?.frequency).toBe('22m');

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );
});
