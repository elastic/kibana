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

  apiTest(
    'internal API sees schedules created by public API (migration continuity)',
    async ({ apiClient }) => {
      const publicApis = getPublicSchedulesApis(apiClient, defaultHeaders);
      const internalApis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

      const publicCreate = await publicApis.createSchedule(
        getSimplePublicSchedule({ name: 'Public schedule' })
      );
      expect(publicCreate.statusCode).toBe(200);

      const internalFind = await internalApis.findSchedules({ per_page: '100' });
      expect(internalFind.statusCode).toBe(200);

      // Schedules created via the public API while the feature flag was off
      // must remain visible from the internal (workflow) API once the flag is
      // on, so they are never "lost" from the UI.
      const internalSchedules = (internalFind.body as { data: Array<{ name: string }> }).data;
      const publicNames = internalSchedules.filter((s) => s.name === 'Public schedule');
      expect(publicNames).toHaveLength(1);
    }
  );

  apiTest(
    'public API does not see schedules created by internal API (public stays legacy-only)',
    async ({ apiClient }) => {
      const publicApis = getPublicSchedulesApis(apiClient, defaultHeaders);
      const internalApis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

      const internalCreate = await internalApis.createSchedule(
        getSimpleWorkflowSchedule({ name: 'Internal schedule' })
      );
      expect(internalCreate.statusCode).toBe(200);

      const publicFind = await publicApis.findSchedules({ per_page: '100' });
      expect(publicFind.statusCode).toBe(200);

      // The public (legacy) API excludes tagged workflow schedules, so internal
      // schedules must not leak into the public view.
      const publicSchedules = (publicFind.body as { data: Array<{ name: string }> }).data;
      const internalNames = publicSchedules.filter((s) => s.name === 'Internal schedule');
      expect(internalNames).toHaveLength(0);
    }
  );

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
    'internal API find returns both its own and public schedules when both exist',
    async ({ apiClient }) => {
      const publicApis = getPublicSchedulesApis(apiClient, defaultHeaders);
      const internalApis = getWorkflowSchedulesApis(apiClient, defaultHeaders);

      await publicApis.createSchedule(getSimplePublicSchedule({ name: 'Public only' }));
      await internalApis.createSchedule(getSimpleWorkflowSchedule({ name: 'Internal only' }));

      const internalFind = await internalApis.findSchedules({ per_page: '100' });
      expect(internalFind.statusCode).toBe(200);

      // The internal (workflow) API is the superset view: it surfaces both its
      // own tagged schedules and untagged schedules created by the public API.
      const internalSchedules = (internalFind.body as { data: Array<{ name: string }> }).data;
      const names = internalSchedules.map((s) => s.name).sort();
      expect(names).toStrictEqual(['Internal only', 'Public only']);
    }
  );
});
