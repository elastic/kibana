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

apiTest.describe('Workflow schedule API - RBAC', { tag: SCHEDULE_TAGS }, () => {
  let adminHeaders: Record<string, string>;
  let viewerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const adminCredentials = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...adminCredentials.cookieHeader };

    const viewerCredentials = await samlAuth.asInteractiveUser('viewer');
    viewerHeaders = { ...viewerCredentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, adminHeaders);
  });

  apiTest('should return 403 when unauthorized user creates a schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, viewerHeaders);

    const { statusCode } = await apis.createSchedule(getSimpleWorkflowSchedule());

    expect(statusCode).toBe(403);
  });

  apiTest('should return 403 when unauthorized user updates a schedule', async ({ apiClient }) => {
    const adminApis = getWorkflowSchedulesApis(apiClient, adminHeaders);
    const viewerApis = getWorkflowSchedulesApis(apiClient, viewerHeaders);

    const createResult = await adminApis.createSchedule(getSimpleWorkflowSchedule());
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { statusCode } = await viewerApis.updateSchedule(createdId, {
      actions: [],
      name: 'Hacked name',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
        },
        size: 20,
      },
      schedule: { interval: '24h' },
    });

    expect(statusCode).toBe(403);
  });

  apiTest('should return 403 when unauthorized user deletes a schedule', async ({ apiClient }) => {
    const adminApis = getWorkflowSchedulesApis(apiClient, adminHeaders);
    const viewerApis = getWorkflowSchedulesApis(apiClient, viewerHeaders);

    const createResult = await adminApis.createSchedule(getSimpleWorkflowSchedule());
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { statusCode } = await viewerApis.deleteSchedule(createdId);

    expect(statusCode).toBe(403);
  });

  apiTest('should return 403 when unauthorized user enables a schedule', async ({ apiClient }) => {
    const adminApis = getWorkflowSchedulesApis(apiClient, adminHeaders);
    const viewerApis = getWorkflowSchedulesApis(apiClient, viewerHeaders);

    const createResult = await adminApis.createSchedule(
      getSimpleWorkflowSchedule({ enabled: false })
    );
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { statusCode } = await viewerApis.enableSchedule(createdId);

    expect(statusCode).toBe(403);
  });

  apiTest('should return 403 when unauthorized user disables a schedule', async ({ apiClient }) => {
    const adminApis = getWorkflowSchedulesApis(apiClient, adminHeaders);
    const viewerApis = getWorkflowSchedulesApis(apiClient, viewerHeaders);

    const createResult = await adminApis.createSchedule(
      getSimpleWorkflowSchedule({ enabled: true })
    );
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { statusCode } = await viewerApis.disableSchedule(createdId);

    expect(statusCode).toBe(403);
  });
});
