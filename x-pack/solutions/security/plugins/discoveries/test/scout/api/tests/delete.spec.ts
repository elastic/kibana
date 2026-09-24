/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';
import { SCHEDULE_TAGS } from '../fixtures/constants';
import {
  deleteAllWorkflowSchedules,
  getScheduleAdminRoleDescriptor,
  getSimpleWorkflowSchedule,
  getWorkflowSchedulesApis,
} from '../fixtures/helpers';

apiTest.describe('Workflow schedule API - delete', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let spaceId: string;

  apiTest.beforeAll(async ({ samlAuth, scheduleSpace }) => {
    spaceId = scheduleSpace.id;

    const credentials = await samlAuth.asInteractiveUser(getScheduleAdminRoleDescriptor());
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ discoveriesApi }) => {
    await deleteAllWorkflowSchedules(discoveriesApi, defaultHeaders, spaceId);
  });

  apiTest('should delete a schedule', async ({ discoveriesApi }) => {
    const apis = getWorkflowSchedulesApis(discoveriesApi, defaultHeaders, spaceId);

    const createResult = await apis.createSchedule(getSimpleWorkflowSchedule(spaceId));
    expect(createResult).toHaveStatusCode(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { body, statusCode } = await apis.deleteSchedule(createdId);

    expect(statusCode).toBe(200);
    expect((body as Record<string, unknown>).id).toBe(createdId);

    const getResult = await apis.getSchedule(createdId);
    expect(getResult).toHaveStatusCode(404);
  });

  apiTest('should return 404 when deleting non-existent schedule', async ({ discoveriesApi }) => {
    const apis = getWorkflowSchedulesApis(discoveriesApi, defaultHeaders, spaceId);

    const response = await apis.deleteSchedule('non-existent-id-12345');
    const body = response.body as { message?: string };

    expect(response).toHaveStatusCode(404);
    expect(body.message).toBeDefined();
  });
});
