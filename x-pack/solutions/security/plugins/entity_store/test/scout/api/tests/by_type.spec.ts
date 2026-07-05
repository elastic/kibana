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
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_INDEX,
} from '../fixtures/constants';
import {
  getStatus,
  installAllEntityTypes,
  uninstallAllEntityTypes,
  installEntityType,
  updateEntityType,
  uninstallEntityType,
} from '../fixtures/helpers';
import { FF_ENABLE_ENTITY_STORE_V2, type EntityType } from '../../../../common';
import {
  DEFAULT_LOG_EXTRACTION_OVERRIDES,
  LOG_EXTRACTION_FREQUENCY_DEFAULT,
} from '../../../../server/domain/saved_objects';

const HISTORY_SNAPSHOT_TASK_ID = `entity_store:v2:history_snapshot_task:default`;
const STATUS_REPORT_TASK_ID = `entity_store:v2:status_report_task:default`;
const getExtractEntityTaskId = (entityType: string) =>
  `entity_store:v2:extract_entity_task:${entityType}:default`;

// The type's own default override when set (e.g. Service/Generic's reduced cadence),
// otherwise the shared global default — mirrors status.spec.ts's expectations.
const effectiveFrequency = (type: EntityType) =>
  DEFAULT_LOG_EXTRACTION_OVERRIDES[type].frequency ?? LOG_EXTRACTION_FREQUENCY_DEFAULT;

apiTest.describe('Entity Store per-entity-type API tests', { tag: ENTITY_STORE_TAGS }, () => {
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

  apiTest.afterEach(async ({ apiClient }) => {
    await uninstallAllEntityTypes(apiClient, defaultHeaders);
  });

  apiTest(
    'install/{entityType} bootstraps the whole store when it is not installed yet',
    async ({ apiClient, kbnClient, esClient }) => {
      const response = await installEntityType(apiClient, defaultHeaders, 'service');
      expect(response.statusCode).toBe(201);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.status).toBe('running');
      expect(status.body.engines.map((e) => e.type)).toStrictEqual(['service']);
      expect(status.body.engines[0].frequency).toBe(effectiveFrequency('service'));

      // shared, store-wide resources were actually created — not just reported by status
      const latestIndexExists = await esClient.indices.exists({ index: LATEST_INDEX });
      expect(latestIndexExists).toBe(true);

      const historySnapshotTask = await kbnClient.savedObjects.get({
        type: 'task',
        id: HISTORY_SNAPSHOT_TASK_ID,
      });
      expect(historySnapshotTask.id).toBe(HISTORY_SNAPSHOT_TASK_ID);

      const statusReportTask = await kbnClient.savedObjects.get({
        type: 'task',
        id: STATUS_REPORT_TASK_ID,
      });
      expect(statusReportTask.id).toBe(STATUS_REPORT_TASK_ID);

      // the extraction task exists only for the requested type, not for every entity type
      const serviceTaskId = getExtractEntityTaskId('service');
      const serviceTask = await kbnClient.savedObjects.get({ type: 'task', id: serviceTaskId });
      expect(serviceTask.id).toBe(serviceTaskId);

      await expect(
        kbnClient.savedObjects.get({ type: 'task', id: getExtractEntityTaskId('host') })
      ).rejects.toThrow('404');
    }
  );

  apiTest(
    'install/{entityType} applies a custom cadence override while bootstrapping the store',
    async ({ apiClient }) => {
      const response = await installEntityType(apiClient, defaultHeaders, 'service', {
        logExtraction: { frequency: '5m' },
      });
      expect(response.statusCode).toBe(201);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.engines.find((e) => e.type === 'service')?.frequency).toBe('5m');
    }
  );

  apiTest(
    'install/{entityType} applies non-cadence fields to the shared config while bootstrapping',
    async ({ apiClient }) => {
      const response = await installEntityType(apiClient, defaultHeaders, 'service', {
        logExtraction: { frequency: '5m', fieldHistoryLength: 25 },
      });
      expect(response.statusCode).toBe(201);

      // add a second type to see that fieldHistoryLength was applied store-wide, not just to service
      await installEntityType(apiClient, defaultHeaders, 'host');

      const status = await getStatus(apiClient, defaultHeaders);
      const service = status.body.engines.find((e) => e.type === 'service');
      const host = status.body.engines.find((e) => e.type === 'host');
      expect(service?.frequency).toBe('5m');
      expect(service?.fieldHistoryLength).toBe(25);
      // host has no cadence override of its own, but does inherit the shared fieldHistoryLength
      expect(host?.frequency).toBe(effectiveFrequency('host'));
      expect(host?.fieldHistoryLength).toBe(25);
    }
  );

  apiTest(
    'install/{entityType} applies non-cadence fields to the shared config, affecting already-installed types too',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['host'] },
      });

      const response = await installEntityType(apiClient, defaultHeaders, 'service', {
        logExtraction: { frequency: '5m', fieldHistoryLength: 25 },
      });
      expect(response.statusCode).toBe(201);

      const status = await getStatus(apiClient, defaultHeaders);
      const service = status.body.engines.find((e) => e.type === 'service');
      const host = status.body.engines.find((e) => e.type === 'host');
      // service gets its own cadence override plus the shared setting
      expect(service?.frequency).toBe('5m');
      expect(service?.fieldHistoryLength).toBe(25);
      // host, installed earlier, keeps its own cadence but picks up the shared setting change
      expect(host?.frequency).toBe(effectiveFrequency('host'));
      expect(host?.fieldHistoryLength).toBe(25);
    }
  );

  apiTest(
    'install/{entityType} adds a type to an already-installed store, without touching other types',
    async ({ apiClient, kbnClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['host'] },
      });
      const hostTaskId = getExtractEntityTaskId('host');
      const hostTaskBefore = await kbnClient.savedObjects.get({ type: 'task', id: hostTaskId });
      expect(hostTaskBefore.id).toBe(hostTaskId);

      const install = await installEntityType(apiClient, defaultHeaders, 'service');
      expect(install.statusCode).toBe(201);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.engines.map((e) => e.type).sort()).toStrictEqual(['host', 'service']);
      const service = status.body.engines.find((e) => e.type === 'service');
      expect(service?.frequency).toBe(effectiveFrequency('service'));

      // the extraction task for the newly-added type was created...
      const serviceTaskId = getExtractEntityTaskId('service');
      const serviceTask = await kbnClient.savedObjects.get({ type: 'task', id: serviceTaskId });
      expect(serviceTask.id).toBe(serviceTaskId);
      // ...and the already-installed type's task is untouched
      const hostTaskAfter = await kbnClient.savedObjects.get({ type: 'task', id: hostTaskId });
      expect(hostTaskAfter.id).toBe(hostTaskId);
    }
  );

  apiTest(
    'install/{entityType} lets a custom cadence override win over the type default',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['host'] },
      });

      await installEntityType(apiClient, defaultHeaders, 'service', {
        logExtraction: { frequency: '5m' },
      });

      const status = await getStatus(apiClient, defaultHeaders);
      const service = status.body.engines.find((e) => e.type === 'service');
      expect(service?.frequency).toBe('5m');
    }
  );

  apiTest('install/{entityType} is idempotent when already installed', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { entityTypes: ['service'] },
    });

    const install = await installEntityType(apiClient, defaultHeaders, 'service', {
      logExtraction: { frequency: '1m' },
    });
    expect(install.statusCode).toBe(200);

    // the second call must not have changed the already-installed engine's cadence
    const status = await getStatus(apiClient, defaultHeaders);
    const service = status.body.engines.find((e) => e.type === 'service');
    expect(service?.frequency).toBe(effectiveFrequency('service'));
  });

  apiTest(
    'update/{entityType} returns 400 when the type is not installed',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['host'] },
      });

      const update = await updateEntityType(apiClient, defaultHeaders, 'service', {
        logExtraction: { frequency: '5m' },
      });
      expect(update.statusCode).toBe(400);
    }
  );

  apiTest(
    'update/{entityType} sets a per-type override without affecting other types',
    async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const update = await updateEntityType(apiClient, defaultHeaders, 'user', {
        logExtraction: { frequency: '5m' },
      });
      expect(update.statusCode).toBe(200);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.engines.find((e) => e.type === 'user')?.frequency).toBe('5m');
      expect(status.body.engines.find((e) => e.type === 'host')?.frequency).toBe(
        effectiveFrequency('host')
      );
      expect(status.body.engines.find((e) => e.type === 'service')?.frequency).toBe(
        effectiveFrequency('service')
      );
      expect(status.body.engines.find((e) => e.type === 'generic')?.frequency).toBe(
        effectiveFrequency('generic')
      );
    }
  );

  apiTest('update/{entityType} rejects an explicit null value', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { entityTypes: ['service'] },
    });

    const update = await updateEntityType(apiClient, defaultHeaders, 'service', {
      logExtraction: { frequency: null },
    });
    expect(update.statusCode).toBe(400);

    // the type's built-in default is unchanged — the null was rejected, not applied
    const status = await getStatus(apiClient, defaultHeaders);
    expect(status.body.engines.find((e) => e.type === 'service')?.frequency).toBe(
      effectiveFrequency('service')
    );
  });

  apiTest(
    'update/{entityType} allows setting a value equal to the default explicitly',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['service'] },
      });

      const serviceDefault = effectiveFrequency('service');
      const update = await updateEntityType(apiClient, defaultHeaders, 'service', {
        logExtraction: { frequency: serviceDefault },
      });
      expect(update.statusCode).toBe(200);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.engines.find((e) => e.type === 'service')?.frequency).toBe(serviceDefault);
    }
  );

  apiTest('update/{entityType} rejects an invalid duration', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { entityTypes: ['service'] },
    });

    const update = await updateEntityType(apiClient, defaultHeaders, 'service', {
      logExtraction: { frequency: '10s' },
    });
    expect(update.statusCode).toBe(400);
  });

  apiTest(
    'update/{entityType} rejects logExtraction fields that are not per-type cadence values',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['service'] },
      });

      // docsLimit is a store-wide setting, not a per-type cadence override — only
      // frequency/delay/lookbackPeriod are settable via this endpoint.
      const update = await updateEntityType(apiClient, defaultHeaders, 'service', {
        logExtraction: { docsLimit: 5000 },
      });
      expect(update.statusCode).toBe(400);
    }
  );

  apiTest(
    'uninstall/{entityType} removes a single type, leaving other types and global state intact',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['host', 'user'] },
      });

      const uninstall = await uninstallEntityType(apiClient, defaultHeaders, 'user');
      expect(uninstall.statusCode).toBe(200);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.status).toBe('running');
      expect(status.body.engines.map((e) => e.type)).toStrictEqual(['host']);
    }
  );

  apiTest(
    'uninstall/{entityType} on the last remaining type tears down the whole store',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes: ['host'] },
      });

      const uninstall = await uninstallEntityType(apiClient, defaultHeaders, 'host');
      expect(uninstall.statusCode).toBe(200);

      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.body.status).toBe('not_installed');
      expect(status.body.engines).toStrictEqual([]);
    }
  );

  apiTest('uninstall/{entityType} is idempotent when not installed', async ({ apiClient }) => {
    const uninstall = await uninstallEntityType(apiClient, defaultHeaders, 'service');
    expect(uninstall.statusCode).toBe(200);
  });
});
