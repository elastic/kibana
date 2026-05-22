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

apiTest.describe('Workflow schedule API - update', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, defaultHeaders);
  });

  apiTest('should update a schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const createResult = await apis.createSchedule(getSimpleWorkflowSchedule());
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const updateBody = {
      actions: [],
      name: 'Updated schedule name',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'updated-connector-id',
        },
        size: 50,
      },
      schedule: {
        interval: '12h',
      },
    };

    const { body, statusCode } = await apis.updateSchedule(createdId, updateBody);

    expect(statusCode).toBe(200);

    const schedule = body as Record<string, unknown>;
    expect(schedule.id).toBe(createdId);
    expect(schedule.name).toBe('Updated schedule name');
    expect(schedule.schedule).toStrictEqual({ interval: '12h' });

    const params = schedule.params as Record<string, unknown>;
    const apiConfig = params.api_config as Record<string, unknown>;
    expect(apiConfig.connector_id).toBe('updated-connector-id');
    expect(params.size).toBe(50);
  });

  apiTest('should return 400 when name is missing from update', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const createResult = await apis.createSchedule(getSimpleWorkflowSchedule());
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const { statusCode } = await apis.updateSchedule(createdId, {
      actions: [],
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

    expect(statusCode).toBe(400);
  });

  apiTest('should return 404 when updating non-existent schedule', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const { statusCode } = await apis.updateSchedule('non-existent-id-12345', {
      actions: [],
      name: 'Does not exist',
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

    expect(statusCode).toBe(404);
  });

  apiTest('should update workflow_config fields', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const createResult = await apis.createSchedule(getSimpleWorkflowSchedule());
    expect(createResult.statusCode).toBe(200);
    const createdId = (createResult.body as Record<string, unknown>).id as string;

    const updateBody = {
      actions: [],
      name: 'Updated with workflow config',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
        },
        size: 20,
        workflow_config: {
          alert_retrieval_mode: 'custom_only',
          alert_retrieval_workflow_ids: ['workflow-abc'],
          validation_workflow_id: 'custom-validation',
        },
      },
      schedule: { interval: '24h' },
    };

    const { body, statusCode } = await apis.updateSchedule(createdId, updateBody);

    expect(statusCode).toBe(200);

    const schedule = body as Record<string, unknown>;
    expect(schedule.name).toBe('Updated with workflow config');
  });
});
