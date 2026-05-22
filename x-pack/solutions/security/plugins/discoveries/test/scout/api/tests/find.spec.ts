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

apiTest.describe('Workflow schedule API - find', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, defaultHeaders);
  });

  apiTest('should return empty result when no schedules exist', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const { body, statusCode } = await apis.findSchedules();

    expect(statusCode).toBe(200);

    const result = body as { data: unknown[]; page: number; per_page: number; total: number };
    expect(result.data).toStrictEqual([]);
    expect(result.total).toBe(0);
  });

  apiTest('should return all created schedules', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Schedule A' }));
    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Schedule B' }));
    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Schedule C' }));

    const { body, statusCode } = await apis.findSchedules();

    expect(statusCode).toBe(200);

    const result = body as { data: Array<{ name: string }>; total: number };
    expect(result.total).toBe(3);
    expect(result.data).toHaveLength(3);

    const names = result.data.map((s) => s.name).sort();
    expect(names).toStrictEqual(['Schedule A', 'Schedule B', 'Schedule C']);
  });

  apiTest('should sort by name ascending', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Charlie' }));
    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Alpha' }));
    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Bravo' }));

    const { body, statusCode } = await apis.findSchedules({
      sort_field: 'name',
      sort_direction: 'asc',
    });

    expect(statusCode).toBe(200);

    const result = body as { data: Array<{ name: string }> };
    const names = result.data.map((s) => s.name);
    expect(names).toStrictEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  apiTest('should sort by name descending', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Charlie' }));
    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Alpha' }));
    await apis.createSchedule(getSimpleWorkflowSchedule({ name: 'Bravo' }));

    const { body, statusCode } = await apis.findSchedules({
      sort_field: 'name',
      sort_direction: 'desc',
    });

    expect(statusCode).toBe(200);

    const result = body as { data: Array<{ name: string }> };
    const names = result.data.map((s) => s.name);
    expect(names).toStrictEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  apiTest('should support pagination', async ({ apiClient }) => {
    const apis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    for (let i = 1; i <= 5; i++) {
      await apis.createSchedule(getSimpleWorkflowSchedule({ name: `Schedule ${i}` }));
    }

    const page1 = await apis.findSchedules({ page: '1', per_page: '2' });
    expect(page1.statusCode).toBe(200);

    const page1Body = page1.body as {
      data: unknown[];
      page: number;
      per_page: number;
      total: number;
    };
    expect(page1Body.data).toHaveLength(2);
    expect(page1Body.total).toBe(5);
    expect(page1Body.page).toBe(1);
    expect(page1Body.per_page).toBe(2);

    const page2 = await apis.findSchedules({ page: '2', per_page: '2' });
    expect(page2.statusCode).toBe(200);

    const page2Body = page2.body as { data: unknown[]; page: number };
    expect(page2Body.data).toHaveLength(2);
    expect(page2Body.page).toBe(2);

    const page3 = await apis.findSchedules({ page: '3', per_page: '2' });
    expect(page3.statusCode).toBe(200);

    const page3Body = page3.body as { data: unknown[] };
    expect(page3Body.data).toHaveLength(1);
  });
});
