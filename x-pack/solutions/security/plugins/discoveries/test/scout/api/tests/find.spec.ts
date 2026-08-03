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
  enableWorkflowsFeatureFlag,
  getScheduleAdminRoleDescriptor,
  getSimpleWorkflowSchedule,
  getWorkflowSchedulesApis,
} from '../fixtures/helpers';

apiTest.describe('Workflow schedule API - find', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
    await enableWorkflowsFeatureFlag(apiServices);

    const credentials = await samlAuth.asInteractiveUser(getScheduleAdminRoleDescriptor());
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

    // Schedules are Alerting rules backed by saved objects, so a create is not
    // guaranteed to be searchable immediately (index refresh lag). Wait until
    // all three are retrievable before asserting (see the pagination test).
    await expect
      .poll(async () => {
        const found = await apis.findSchedules({ per_page: '100' });
        return (found.body as { data: unknown[] }).data.length;
      })
      .toBe(3);

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

    // Wait until all three are searchable before asserting order (index refresh
    // lag; see the pagination test).
    await expect
      .poll(async () => {
        const found = await apis.findSchedules({ per_page: '100' });
        return (found.body as { data: unknown[] }).data.length;
      })
      .toBe(3);

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

    // Wait until all three are searchable before asserting order (index refresh
    // lag; see the pagination test).
    await expect
      .poll(async () => {
        const found = await apis.findSchedules({ per_page: '100' });
        return (found.body as { data: unknown[] }).data.length;
      })
      .toBe(3);

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

    // Schedules are Alerting rules backed by saved objects, so a create is not
    // guaranteed to be searchable immediately (index refresh lag). Wait until
    // all five are actually retrievable (not just counted) before asserting
    // pagination, so the test does not race the refresh.
    await expect
      .poll(async () => {
        const { body } = await apis.findSchedules({ per_page: '100' });
        return (body as { data: unknown[] }).data.length;
      })
      .toBe(5);

    // The internal find API uses a 0-based `page` (matching EUI's `pageIndex`);
    // the data client adds 1 before delegating to the 1-based `rulesClient`. So
    // page 0/1/2 with per_page 2 over 5 schedules yields 2/2/1 rows.
    //
    // Also sort by the unique `name` field: the five schedules are created in a
    // tight loop and share the same created_at/updated_at timestamp, so without
    // a unique sort key Elasticsearch from/size pagination over tied keys could
    // return a row on multiple pages (or skip one), making the counts flaky.
    const sortByName = { sort_direction: 'asc', sort_field: 'name' } as const;

    const firstPage = await apis.findSchedules({ ...sortByName, page: '0', per_page: '2' });
    expect(firstPage.statusCode).toBe(200);

    const firstPageBody = firstPage.body as {
      data: unknown[];
      page: number;
      per_page: number;
      total: number;
    };
    expect(firstPageBody.data).toHaveLength(2);
    expect(firstPageBody.total).toBe(5);
    expect(firstPageBody.page).toBe(0);
    expect(firstPageBody.per_page).toBe(2);

    const secondPage = await apis.findSchedules({ ...sortByName, page: '1', per_page: '2' });
    expect(secondPage.statusCode).toBe(200);

    const secondPageBody = secondPage.body as { data: unknown[]; page: number };
    expect(secondPageBody.data).toHaveLength(2);
    expect(secondPageBody.page).toBe(1);

    const thirdPage = await apis.findSchedules({ ...sortByName, page: '2', per_page: '2' });
    expect(thirdPage.statusCode).toBe(200);

    const thirdPageBody = thirdPage.body as { data: unknown[] };
    expect(thirdPageBody.data).toHaveLength(1);
  });
});
