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
  LATEST_INDEX,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { forceLogExtraction } from '../fixtures/helpers';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

type ApiWorkerFixtures = Parameters<Parameters<typeof apiTest>[2]>[0];

const HISTORY_SNAPSHOT_TASK_ID = `entity_store:v2:history_snapshot_task:default`;
const STATUS_REPORT_TASK_ID = `entity_store:v2:status_report_task:default`;

const getExtractEntityTaskId = (entityType: string) =>
  `entity_store:v2:extract_entity_task:${entityType}:default`;

apiTest.describe('Entity Store uninstall', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
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

  // Regression for https://github.com/elastic/security-team/issues/18143:
  // the latest index, updates/metadata data streams and EUID scripts are shared per
  // namespace. Uninstalling one entity type must NOT delete them while other engines
  // are still installed — otherwise the surviving engines' extraction fails with
  // `verification_exception: Unknown index [...]` / `index_not_found_exception`.
  apiTest(
    'keeps shared assets when only one of several engines is uninstalled',
    async ({ apiClient, esClient }) => {
      await install(apiClient, { entityTypes: ['user', 'host'] });

      // Shared assets exist after install.
      expect(await esClient.indices.exists({ index: LATEST_INDEX })).toBe(true);
      const updatesBefore = await esClient.indices.getDataStream({ name: UPDATES_INDEX });
      expect(updatesBefore.data_streams).toHaveLength(1);

      // Uninstall a single type; the other engine stays installed.
      await uninstall(apiClient, { entityTypes: ['host'] });

      // Shared assets must still exist for the surviving `user` engine.
      expect(await esClient.indices.exists({ index: LATEST_INDEX })).toBe(true);
      const updatesAfter = await esClient.indices.getDataStream({ name: UPDATES_INDEX });
      expect(updatesAfter.data_streams).toHaveLength(1);

      // End-to-end: the surviving engine's extraction still succeeds (this is what
      // fails in production when the shared index/data stream get deleted).
      const extraction = await forceLogExtraction(
        apiClient,
        internalHeaders,
        'user',
        '2026-01-20T11:00:00Z',
        '2026-01-20T13:00:00Z'
      );
      expect(extraction.statusCode).toBe(200);
      expect(extraction.body).toMatchObject({ success: true });

      // Uninstalling the last remaining engine tears the shared index down as expected.
      await uninstall(apiClient, { entityTypes: ['user'] });
      expect(await esClient.indices.exists({ index: LATEST_INDEX })).toBe(false);
    }
  );

  apiTest('uninstall is a no-op when entity store is not installed', async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });
});
