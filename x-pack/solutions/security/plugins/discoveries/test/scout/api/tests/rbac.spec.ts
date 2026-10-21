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
  getAlertsIndexPatternForSpace,
  getGenerateApi,
  getMonitoringApis,
  getSimpleGenerateBody,
  getSimpleWorkflowSchedule,
  getWorkflowSchedulesApis,
} from '../fixtures/helpers';

// Execution ids that do not exist in the event log. Monitoring reads for
// these resolve to `404 Not Found` (not `403 Forbidden`), which lets us assert
// route-level authorization succeeded without seeding a real execution.
const UNKNOWN_EXECUTION_ID = 'unknown-execution-id';
const UNKNOWN_WORKFLOW_ID = 'unknown-workflow-id';
const UNKNOWN_EXECUTION_MESSAGE = `Execution ${UNKNOWN_EXECUTION_ID} not found in event log`;

apiTest.describe('Workflow schedule API - RBAC', { tag: SCHEDULE_TAGS }, () => {
  let adminHeaders: Record<string, string>;
  let viewerHeaders: Record<string, string>;
  let monitorHeaders: Record<string, string>;
  let spaceId: string;

  apiTest.beforeAll(async ({ samlAuth, scheduleSpace }) => {
    spaceId = scheduleSpace.id;

    const adminCredentials = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...adminCredentials.cookieHeader };

    const viewerCredentials = await samlAuth.asInteractiveUser('viewer');
    viewerHeaders = { ...viewerCredentials.cookieHeader };

    // Purpose-built monitoring role for the least-privilege matrix (bead
    // kibana-5wd6.1): the execution-monitoring routes require attack discovery
    // + alerts read + workflows READ (but NOT execute). This role grants
    // exactly those privileges plus event-log index read (the tracking read is
    // executed as the requesting user), so it is authorized to MONITOR
    // executions while remaining unable to trigger them.
    const monitorCredentials = await samlAuth.asInteractiveUser({
      elasticsearch: {
        cluster: [],
        indices: [{ names: ['.kibana-event-log*'], privileges: ['read'] }],
      },
      kibana: [
        {
          base: [],
          feature: {
            securitySolutionAlertsV1: ['read'],
            securitySolutionAttackDiscovery: ['all'],
            workflowsManagement: ['read'],
          },
          spaces: ['*'],
        },
      ],
    });
    monitorHeaders = { ...monitorCredentials.cookieHeader };
  });

  apiTest.afterEach(async ({ discoveriesApi }) => {
    await deleteAllWorkflowSchedules(discoveriesApi, adminHeaders, spaceId);
  });

  apiTest(
    'should return 403 when unauthorized user creates a schedule',
    async ({ discoveriesApi }) => {
      const apis = getWorkflowSchedulesApis(discoveriesApi, viewerHeaders, spaceId);

      const response = await apis.createSchedule(getSimpleWorkflowSchedule(spaceId));
      const body = response.body as { error?: string; message?: string };

      expect(response).toHaveStatusCode(403);
      expect(body.error).toBe('Forbidden');
    }
  );

  apiTest(
    'should return 403 when unauthorized user updates a schedule',
    async ({ discoveriesApi }) => {
      const adminApis = getWorkflowSchedulesApis(discoveriesApi, adminHeaders, spaceId);
      const viewerApis = getWorkflowSchedulesApis(discoveriesApi, viewerHeaders, spaceId);

      const createResult = await adminApis.createSchedule(getSimpleWorkflowSchedule(spaceId));
      expect(createResult).toHaveStatusCode(200);
      const createdId = (createResult.body as Record<string, unknown>).id as string;

      const response = await viewerApis.updateSchedule(createdId, {
        actions: [],
        name: 'Hacked name',
        params: {
          alerts_index_pattern: getAlertsIndexPatternForSpace(spaceId),
          api_config: {
            action_type_id: '.gen-ai',
            connector_id: 'test-connector-id',
          },
          size: 20,
        },
        schedule: { interval: '24h' },
      });
      const body = response.body as { error?: string; message?: string };

      expect(response).toHaveStatusCode(403);
      expect(body.error).toBe('Forbidden');
    }
  );

  apiTest(
    'should return 403 when unauthorized user deletes a schedule',
    async ({ discoveriesApi }) => {
      const adminApis = getWorkflowSchedulesApis(discoveriesApi, adminHeaders, spaceId);
      const viewerApis = getWorkflowSchedulesApis(discoveriesApi, viewerHeaders, spaceId);

      const createResult = await adminApis.createSchedule(getSimpleWorkflowSchedule(spaceId));
      expect(createResult).toHaveStatusCode(200);
      const createdId = (createResult.body as Record<string, unknown>).id as string;

      const response = await viewerApis.deleteSchedule(createdId);
      const body = response.body as { error?: string; message?: string };

      expect(response).toHaveStatusCode(403);
      expect(body.error).toBe('Forbidden');
    }
  );

  apiTest(
    'should return 403 when unauthorized user enables a schedule',
    async ({ discoveriesApi }) => {
      const adminApis = getWorkflowSchedulesApis(discoveriesApi, adminHeaders, spaceId);
      const viewerApis = getWorkflowSchedulesApis(discoveriesApi, viewerHeaders, spaceId);

      const createResult = await adminApis.createSchedule(
        getSimpleWorkflowSchedule(spaceId, { enabled: false })
      );
      expect(createResult).toHaveStatusCode(200);
      const createdId = (createResult.body as Record<string, unknown>).id as string;

      const response = await viewerApis.enableSchedule(createdId);
      const body = response.body as { error?: string; message?: string };

      expect(response).toHaveStatusCode(403);
      expect(body.error).toBe('Forbidden');
    }
  );

  apiTest(
    'should return 403 when unauthorized user disables a schedule',
    async ({ discoveriesApi }) => {
      const adminApis = getWorkflowSchedulesApis(discoveriesApi, adminHeaders, spaceId);
      const viewerApis = getWorkflowSchedulesApis(discoveriesApi, viewerHeaders, spaceId);

      const createResult = await adminApis.createSchedule(
        getSimpleWorkflowSchedule(spaceId, { enabled: true })
      );
      expect(createResult).toHaveStatusCode(200);
      const createdId = (createResult.body as Record<string, unknown>).id as string;

      const response = await viewerApis.disableSchedule(createdId);
      const body = response.body as { error?: string; message?: string };

      expect(response).toHaveStatusCode(403);
      expect(body.error).toBe('Forbidden');
    }
  );

  // Run-triggering route (least-privilege matrix, bead kibana-5wd6.1): the
  // internal `_generate` route requires workflows read + execute. The `viewer`
  // role has workflows read but NOT execute, so route-level authorization
  // rejects the request with a synchronous 403 before the pipeline is
  // dispatched.
  apiTest(
    'should return 403 when unauthorized user generates discoveries',
    async ({ discoveriesApi }) => {
      const viewerApi = getGenerateApi(discoveriesApi, viewerHeaders, spaceId);

      const response = await viewerApi.generate(getSimpleGenerateBody(spaceId));
      const body = response.body as { error?: string; message?: string };

      expect(response).toHaveStatusCode(403);
      expect(body.error).toBe('Forbidden');
    }
  );

  // Monitoring routes (least-privilege matrix, bead kibana-5wd6.1): execution
  // tracking + pipeline data require workflows READ (not execute), so a
  // workflows-read caller is AUTHORIZED to monitor executions even though it
  // cannot trigger them (see the `_generate` 403 above). Route-level
  // authorization therefore does not reject the request; for an execution id
  // that does not exist the handler resolves to `404 Not Found`. The message
  // is asserted too, because the feature gate and an invalid path also answer
  // 404 and would otherwise pass without ever reaching the handler.
  apiTest(
    'should authorize a workflows-read user to read execution tracking',
    async ({ apiClient }) => {
      const monitorApis = getMonitoringApis(apiClient, monitorHeaders, spaceId);

      const response = await monitorApis.getExecutionTracking(UNKNOWN_EXECUTION_ID);

      expect(response).toHaveStatusCode(404);
      expect(response.body).toMatchObject({ message: UNKNOWN_EXECUTION_MESSAGE });
    }
  );

  apiTest('should authorize a workflows-read user to read pipeline data', async ({ apiClient }) => {
    const monitorApis = getMonitoringApis(apiClient, monitorHeaders, spaceId);

    const response = await monitorApis.getPipelineData(UNKNOWN_WORKFLOW_ID, UNKNOWN_EXECUTION_ID);

    expect(response).toHaveStatusCode(404);
    expect(response.body).toMatchObject({ message: UNKNOWN_EXECUTION_MESSAGE });
  });
});
