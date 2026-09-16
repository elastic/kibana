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
  enableWorkflowsFeatureFlag,
  getSimpleWorkflowSchedule,
  getWorkflowSchedulesApis,
} from '../fixtures/helpers';

/**
 * Placeholder tests that verify the Scout test scaffold is wired up correctly.
 * These will be replaced by full CRUD, lifecycle, RBAC, and isolation tests
 * in bead kibana-9p4.11.
 */
apiTest.describe('Workflow schedule API - scaffold verification', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, kbnClient, samlAuth }) => {
    await enableWorkflowsFeatureFlag({ apiServices, kbnClient });

    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterAll(async ({ discoveriesApi }) => {
    await deleteAllWorkflowSchedules(discoveriesApi, defaultHeaders);
  });

  apiTest('scaffold: can import test utilities without errors', async ({ discoveriesApi }) => {
    const schedule = getSimpleWorkflowSchedule();
    expect(schedule).toBeDefined();
    expect(schedule.name).toBe('Test workflow schedule');

    const apis = getWorkflowSchedulesApis(discoveriesApi, defaultHeaders);
    expect(apis.createSchedule).toBeDefined();
    expect(apis.deleteSchedule).toBeDefined();
    expect(apis.disableSchedule).toBeDefined();
    expect(apis.enableSchedule).toBeDefined();
    expect(apis.findSchedules).toBeDefined();
    expect(apis.getSchedule).toBeDefined();
    expect(apis.updateSchedule).toBeDefined();
  });
});
