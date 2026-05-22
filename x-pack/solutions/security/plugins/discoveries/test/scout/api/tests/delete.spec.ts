/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { SCHEDULE_TAGS } from '../fixtures/constants';
import {
  deleteAllWorkflowSchedules,
  getSimpleWorkflowSchedule,
  getWorkflowSchedulesApis,
} from '../fixtures/helpers';

apiTest.describe('Workflow schedule API - delete', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, defaultHeaders);
  });

  apiTest('should delete a schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const createResult = await apis.createSchedule(getSimpleWorkflowSchedule());
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { body, statusCode } = await apis.deleteSchedule(createdId);

    expect(statusCode).toBe(200);
    expect((body as Record<string, unknown>).id).toBe(createdId);

    const getResult = await apis.getSchedule(createdId);
    expect(getResult.statusCode).toBe(404);
  });

  apiTest('should return 404 when deleting non-existent schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const { statusCode } = await apis.deleteSchedule('non-existent-id-12345');

    expect(statusCode).toBe(404);
  });
});
