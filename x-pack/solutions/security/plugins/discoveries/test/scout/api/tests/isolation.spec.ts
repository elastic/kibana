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
  deleteAllPublicSchedules,
  deleteAllWorkflowSchedules,
  getPublicSchedulesApis,
  getSimplePublicSchedule,
  getSimpleWorkflowSchedule,
  getWorkflowSchedulesApis,
} from '../fixtures/helpers';

apiTest.describe('Workflow schedule API - isolation', { tag: SCHEDULE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await deleteAllWorkflowSchedules(apiClient, defaultHeaders);
    await deleteAllPublicSchedules(apiClient, defaultHeaders);
  });

  apiTest('internal API should not see schedules created by public API', async ({ apiClient }) => {
    const publicApis = getPublicSchedulesApis(apiClient, defaultHeaders);
    const internalApis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

    const publicCreate = await publicApis.createSchedule(
      getSimplePublicSchedule({ name: 'Public schedule' })
    );
    expect(publicCreate.statusCode).toBe(200);

    const internalFind = await internalApis.findSchedules({ per_page: '100' });
    expect(internalFind.statusCode).toBe(200);

    const internalSchedules = (internalFind.body as { data: Array<{ name: string }> }).data;
    const publicNames = internalSchedules.filter((s) => s.name === 'Public schedule');
    expect(publicNames).toHaveLength(0);
  });

  apiTest(
    'internal API can get a public schedule by id (by-ID operations are not tag-filtered)',
    async ({ apiClient }) => {
      const publicApis = getPublicSchedulesApis(apiClient, defaultHeaders);
      const internalApis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

      const publicCreate = await publicApis.createSchedule(
        getSimplePublicSchedule({ name: 'Public schedule for get' })
      );
      expect(publicCreate.statusCode).toBe(200);
      const publicId = (publicCreate.body as Record<string, unknown>).id as string;

      // By-ID operations (getSchedule) use rulesClient.get() which fetches by ID without
      // tag filtering. Isolation is enforced at the find level (filterTags), not by-ID level.
      const internalGet = await internalApis.getSchedule(publicId);
      expect(internalGet.statusCode).toBe(200);
    }
  );

  apiTest(
    'internal API can delete a public schedule by id (by-ID operations are not tag-filtered)',
    async ({ apiClient }) => {
      const publicApis = getPublicSchedulesApis(apiClient, defaultHeaders);
      const internalApis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

      const publicCreate = await publicApis.createSchedule(
        getSimplePublicSchedule({ name: 'Public schedule for delete' })
      );
      expect(publicCreate.statusCode).toBe(200);
      const publicId = (publicCreate.body as Record<string, unknown>).id as string;

      // By-ID operations (deleteSchedule) use rulesClient.delete() which deletes by ID without
      // tag filtering. Isolation is enforced at the find level (filterTags), not by-ID level.
      const internalDelete = await internalApis.deleteSchedule(publicId);
      expect(internalDelete.statusCode).toBe(200);

      const publicGet = await publicApis.getSchedule(publicId);
      expect(publicGet.statusCode).toBe(404);
    }
  );

  apiTest(
    'internal API find should only return its own schedules when both exist',
    async ({ apiClient }) => {
      const publicApis = getPublicSchedulesApis(apiClient, defaultHeaders);
      const internalApis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

      await publicApis.createSchedule(getSimplePublicSchedule({ name: 'Public only' }));
      await internalApis.createSchedule(getSimpleWorkflowSchedule({ name: 'Internal only' }));

      const internalFind = await internalApis.findSchedules({ per_page: '100' });
      expect(internalFind.statusCode).toBe(200);

      const internalSchedules = (internalFind.body as { data: Array<{ name: string }> }).data;
      expect(internalSchedules).toHaveLength(1);
      expect(internalSchedules[0].name).toBe('Internal only');
    }
  );
});
