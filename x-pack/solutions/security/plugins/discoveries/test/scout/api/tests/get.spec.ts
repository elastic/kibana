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

apiTest.describe('Workflow schedule API - get', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, defaultHeaders);
  });

  apiTest('should get a schedule by id', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const scheduleBody = getSimpleWorkflowSchedule();

    const createResult = await apis.createSchedule(scheduleBody);
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { body, statusCode } = await apis.getSchedule(createdId);

    expect(statusCode).toBe(200);

    const schedule = body as Record<string, unknown>;
    expect(schedule.id).toBe(createdId);
    expect(schedule.name).toBe('Test workflow schedule');
    expect(schedule.enabled).toBe(false);
    expect(schedule.schedule).toStrictEqual({ interval: '24h' });
  });

  apiTest('should return 404 for non-existent schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const { statusCode } = await apis.getSchedule('non-existent-id-12345');

    expect(statusCode).toBe(404);
  });
});
