/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices } from '../fixtures/helpers';

// task:entity_store:v2:history_snapshot_task:<namespace>
const HISTORY_SNAPSHOT_TASK_DOC_ID = 'task:entity_store:v2:history_snapshot_task:default';

const getHistorySnapshotTaskRunAt = async (esClient: EsClient): Promise<Date> => {
  try {
    const doc = await esClient.get({
      index: '.kibana_task_manager',
      id: HISTORY_SNAPSHOT_TASK_DOC_ID,
    });
    const { task } = doc._source as { task: { runAt: string } };
    return new Date(task.runAt);
  } catch {
    // Task not yet created — return epoch so poll retries
    return new Date(0);
  }
};

apiTest.describe('Entity Store History Snapshot Task Cadence', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;
  let initialRunAt: Date;

  apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

    const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(installResponse.statusCode).toBe(201);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
    await clearEntityStoreIndices(esClient);
  });

  apiTest(
    'after install with no timezone: task runAt is within 24 hours and 1 minute',
    async ({ esClient }) => {
      const now = Date.now();
      const maxRunAt = now + 24 * 60 * 60 * 1000 + 60 * 1000; // 24h + 1min

      let runAt = new Date(0);
      await expect
        .poll(
          async () => {
            runAt = await getHistorySnapshotTaskRunAt(esClient);
            return runAt.getTime();
          },
          { timeout: 10_000, intervals: [50] }
        )
        .toBeGreaterThan(now);

      expect(runAt.getTime()).toBeLessThanOrEqual(maxRunAt);

      initialRunAt = runAt;
    }
  );

  apiTest(
    'after update with timezone: task runAt is scheduled at midnight UTC (00:00:00)',
    async ({ apiClient, esClient }) => {
      const updateResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.internal.UPDATE_SNAPSHOT_TASK,
        {
          headers: internalHeaders,
          responseType: 'json',
          body: { timezone: 'UTC' },
        }
      );
      expect(updateResponse.statusCode).toBe(200);

      let runAt = new Date(0);
      await expect
        .poll(
          async () => {
            runAt = await getHistorySnapshotTaskRunAt(esClient);
            return runAt.getTime();
          },
          { timeout: 10_000, intervals: [50] }
        )
        .not.toBe(initialRunAt.getTime());

      expect(runAt.getUTCHours()).toBe(0);
      expect(runAt.getUTCMinutes()).toBe(0);
    }
  );
});
