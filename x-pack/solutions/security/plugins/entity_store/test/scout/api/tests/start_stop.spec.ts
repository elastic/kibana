/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '@kbn/scout-security';
import { PUBLIC_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

/**
 * Polls for a task saved object to exist, retrying until it appears or timeout.
 * Task registration after start/install is asynchronous so a direct read can 404.
 */
const waitForTask = async (
  kbnClient: Parameters<Parameters<typeof apiTest>[2]>[0]['kbnClient'],
  taskId: string,
  { timeoutMs = 15_000, intervalMs = 500 } = {}
) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return await kbnClient.savedObjects.get({ type: 'task', id: taskId });
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw lastError ?? new Error(`Task ${taskId} not found after ${timeoutMs}ms`);
};

/**
 * Task ID format used by the entity store extract entity task.
 * Must match server/tasks/extract_entity_task.ts getTaskId(entityType, namespace).
 * Default namespace is 'default' when request has no space context.
 */
const getExtractEntityTaskId = (entityType: string, namespace: string = 'default'): string =>
  `entity_store:v2:extract_entity_task:${entityType}:${namespace}`;

apiTest.describe('Entity Store stop/start API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
  });

  apiTest(
    'Should stop and start the extract entity task after install',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      const entityTypes = ['user'] as const;
      const taskId = getExtractEntityTaskId('user');

      // 1. Install entity store for user only
      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes },
      });
      expect(installResponse.statusCode).toBe(201);

      // 2. Verify the task for the entity is running (scheduled).
      // Task registration after install is async, so poll until it appears.
      let task = await waitForTask(kbnClient, taskId);
      expect(task).toBeDefined();
      expect(task.id).toBe(taskId);
      expect(task.attributes?.taskType).toBe('entity_store:v2:extract_entity_task:user');

      // 3. Trigger stop endpoint
      const stopResponse = await apiClient.put(ENTITY_STORE_ROUTES.public.STOP, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes },
      });
      expect(stopResponse.statusCode).toBe(200);

      // 4. Verify the task has been stopped (task removed from task manager)
      let taskNotFoundAfterStop = false;
      try {
        await kbnClient.savedObjects.get({ type: 'task', id: taskId });
      } catch {
        taskNotFoundAfterStop = true;
      }
      expect(taskNotFoundAfterStop).toBe(true);

      // 5. Trigger start endpoint
      const startResponse = await apiClient.put(ENTITY_STORE_ROUTES.public.START, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes },
      });
      expect(startResponse.statusCode).toBe(200);

      // 6. Verify the task is running again.
      // Task re-registration after start is async, so poll until it appears.
      task = await waitForTask(kbnClient, taskId);
      expect(task).toBeDefined();
      expect(task.id).toBe(taskId);
      expect(task.attributes?.taskType).toBe('entity_store:v2:extract_entity_task:user');

      // 7. Trigger uninstall endpoint
      const uninstallResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes },
      });
      expect(uninstallResponse.statusCode).toBe(200);
    }
  );
});
