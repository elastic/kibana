/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '@kbn/scout-security';
import { COMMON_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

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
      ...COMMON_HEADERS,
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
      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes },
      });
      expect(installResponse.statusCode).toBe(201);

      // 2. Verify the task for the entity is running (scheduled)
      let task = await kbnClient.savedObjects.get({ type: 'task', id: taskId });
      expect(task).toBeDefined();
      expect(task.id).toBe(taskId);
      expect(task.attributes?.taskType).toBe('entity_store:v2:extract_entity_task:user');

      // 3. Trigger stop endpoint
      const stopResponse = await apiClient.put(ENTITY_STORE_ROUTES.STOP, {
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
      const startResponse = await apiClient.put(ENTITY_STORE_ROUTES.START, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes },
      });
      expect(startResponse.statusCode).toBe(200);

      // 6. Verify the task is running again
      task = await kbnClient.savedObjects.get({ type: 'task', id: taskId });
      expect(task).toBeDefined();
      expect(task.id).toBe(taskId);
      expect(task.attributes?.taskType).toBe('entity_store:v2:extract_entity_task:user');

      // 7. Trigger uninstall endpoint
      const uninstallResponse = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entityTypes },
      });
      expect(uninstallResponse.statusCode).toBe(200);
    }
  );
});
