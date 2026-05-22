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

apiTest.describe('Workflow schedule API - create', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, defaultHeaders);
  });

  apiTest('should create a schedule with all fields', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const scheduleBody = getSimpleWorkflowSchedule();

    const { body, statusCode } = await apis.createSchedule(scheduleBody);

    expect(statusCode).toBe(200);

    const schedule = body as Record<string, unknown>;
    expect(schedule.id).toBeDefined();
    expect(schedule.name).toBe('Test workflow schedule');
    expect(schedule.enabled).toBe(false);
    expect(schedule.created_by).toBeDefined();
    expect(schedule.updated_by).toBeDefined();
    expect(schedule.created_at).toBeDefined();
    expect(schedule.updated_at).toBeDefined();
    expect(schedule.actions).toStrictEqual([]);
    expect(schedule.schedule).toStrictEqual({ interval: '24h' });

    const params = schedule.params as Record<string, unknown>;
    expect(params.alerts_index_pattern).toBe('.alerts-security.alerts-default');
    expect(params.size).toBe(20);

    const apiConfig = params.api_config as Record<string, unknown>;
    expect(apiConfig.action_type_id).toBe('.gen-ai');
    expect(apiConfig.connector_id).toBe('test-connector-id');
  });

  apiTest('should default enabled to false when omitted', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const { enabled: _, ...scheduleWithoutEnabled } = getSimpleWorkflowSchedule();

    const { body, statusCode } = await apis.createSchedule(scheduleWithoutEnabled);

    expect(statusCode).toBe(200);
    expect((body as Record<string, unknown>).enabled).toBe(false);
  });

  apiTest('should default actions to empty array when omitted', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const { actions: _, ...scheduleWithoutActions } = getSimpleWorkflowSchedule();

    const { body, statusCode } = await apis.createSchedule(scheduleWithoutActions);

    expect(statusCode).toBe(200);
    expect((body as Record<string, unknown>).actions).toStrictEqual([]);
  });

  apiTest('should return 400 when name is missing', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const { name: _, ...scheduleWithoutName } = getSimpleWorkflowSchedule();

    const { statusCode } = await apis.createSchedule(scheduleWithoutName);

    expect(statusCode).toBe(400);
  });

  apiTest('should return 400 when params is missing', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const { params: _, ...scheduleWithoutParams } = getSimpleWorkflowSchedule();

    const { statusCode } = await apis.createSchedule(scheduleWithoutParams);

    expect(statusCode).toBe(400);
  });

  apiTest('should return 400 when schedule is missing', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const { schedule: _, ...scheduleWithoutSchedule } = getSimpleWorkflowSchedule();

    const { statusCode } = await apis.createSchedule(scheduleWithoutSchedule);

    expect(statusCode).toBe(400);
  });

  apiTest('should persist workflow_config params', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const scheduleBody = getSimpleWorkflowSchedule({
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector-id',
        },
        size: 50,
        workflow_config: {
          alert_retrieval_mode: 'custom_only',
          alert_retrieval_workflow_ids: ['workflow-1', 'workflow-2'],
          validation_workflow_id: 'custom-validation',
        },
      },
    });

    const { body, statusCode } = await apis.createSchedule(scheduleBody);

    expect(statusCode).toBe(200);

    const params = (body as Record<string, unknown>).params as Record<string, unknown>;
    expect(params.size).toBe(50);
  });

  apiTest('should persist snake_case api_config fields', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);
    const scheduleBody = getSimpleWorkflowSchedule({
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.bedrock',
          connector_id: 'bedrock-connector-123',
          default_system_prompt_id: 'prompt-abc',
          model: 'claude-3-sonnet',
          name: 'My Bedrock Connector',
        },
        size: 100,
      },
    });

    const { body, statusCode } = await apis.createSchedule(scheduleBody);

    expect(statusCode).toBe(200);

    const params = (body as Record<string, unknown>).params as Record<string, unknown>;
    const apiConfig = params.api_config as Record<string, unknown>;
    expect(apiConfig.action_type_id).toBe('.bedrock');
    expect(apiConfig.connector_id).toBe('bedrock-connector-123');
  });
});
