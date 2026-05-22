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

apiTest.describe('Workflow schedule API - disable', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, defaultHeaders);
  });

  apiTest('should disable an enabled schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const createResult = await apis.createSchedule(getSimpleWorkflowSchedule({ enabled: true }));
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { body, statusCode } = await apis.disableSchedule(createdId);

    expect(statusCode).toBe(200);
    expect((body as Record<string, unknown>).id).toBe(createdId);

    const getResult = await apis.getSchedule(createdId);
    expect(getResult.statusCode).toBe(200);
    expect((getResult.body as Record<string, unknown>).enabled).toBe(false);
  });

  apiTest('should return 404 for non-existent schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const { statusCode } = await apis.disableSchedule('non-existent-id-12345');

    expect(statusCode).toBe(404);
  });
});
