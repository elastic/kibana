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
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

type ApiWorkerFixtures = Parameters<Parameters<typeof apiTest>[2]>[0];

const HISTORY_SNAPSHOT_TASK_ID = `entity_store:v2:history_snapshot_task:default`;
const STATUS_REPORT_TASK_ID = `entity_store:v2:status_report_task:default`;

const getExtractEntityTaskId = (entityType: string) =>
  `entity_store:v2:extract_entity_task:${entityType}:default`;

apiTest.describe('Entity Store uninstall', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
  });

  const install = async (
    apiClient: ApiWorkerFixtures['apiClient'],
    body: Record<string, unknown> = {}
  ) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body,
    });
    expect(response.statusCode).toBe(201);
  };

  const uninstall = async (
    apiClient: ApiWorkerFixtures['apiClient'],
    body: Record<string, unknown> = {}
  ) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body,
    });
    expect(response.statusCode).toBe(200);
  };

  const assertTaskGone = async (kbnClient: ApiWorkerFixtures['kbnClient'], taskId: string) => {
    await expect(kbnClient.savedObjects.get({ type: 'task', id: taskId })).rejects.toThrow('404');
  };

  apiTest('stops the history snapshot task on uninstall', async ({ apiClient, kbnClient }) => {
    await install(apiClient, { historySnapshot: { frequency: '24h' } });

    const task = await kbnClient.savedObjects.get({
      type: 'task',
      id: HISTORY_SNAPSHOT_TASK_ID,
    });
    expect(task.id).toBe(HISTORY_SNAPSHOT_TASK_ID);

    await uninstall(apiClient);

    await assertTaskGone(kbnClient, HISTORY_SNAPSHOT_TASK_ID);
  });

  apiTest('stops the status report task on uninstall', async ({ apiClient, kbnClient }) => {
    await install(apiClient);

    const task = await kbnClient.savedObjects.get({
      type: 'task',
      id: STATUS_REPORT_TASK_ID,
    });
    expect(task.id).toBe(STATUS_REPORT_TASK_ID);

    await uninstall(apiClient);

    await assertTaskGone(kbnClient, STATUS_REPORT_TASK_ID);
  });

  apiTest('stops extract entity tasks on uninstall', async ({ apiClient, kbnClient }) => {
    const entityTypes = ['user', 'host'] as const;
    await install(apiClient, { entityTypes });

    for (const entityType of entityTypes) {
      const taskId = getExtractEntityTaskId(entityType);
      const task = await kbnClient.savedObjects.get({ type: 'task', id: taskId });
      expect(task.id).toBe(taskId);
    }

    await uninstall(apiClient, { entityTypes });

    for (const entityType of entityTypes) {
      await assertTaskGone(kbnClient, getExtractEntityTaskId(entityType));
    }
  });

  apiTest('deletes the latest entities index on uninstall', async ({ apiClient, esClient }) => {
    await install(apiClient);

    const existsBefore = await esClient.indices.exists({ index: LATEST_INDEX });
    expect(existsBefore).toBe(true);

    await uninstall(apiClient);

    const existsAfter = await esClient.indices.exists({ index: LATEST_INDEX });
    expect(existsAfter).toBe(false);
  });

  apiTest('uninstall is a no-op when entity store is not installed', async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });
});
