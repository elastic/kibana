/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../../fixtures';

apiTest.describe('feature controls', { tag: '@local-stateful-classic' }, () => {
  const space1Id = 'space_1';
  const space2Id = 'space_2';
  let spaceUserCookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ kbnClient, samlAuth }) => {
    await kbnClient.spaces.create({ id: space1Id, name: space1Id, disabledFeatures: [] });
    await kbnClient.spaces.create({ id: space2Id, name: space2Id, disabledFeatures: [] });

    const spaceUserCredentials = await samlAuth.asInteractiveUser({
      elasticsearch: {
        indices: [{ names: ['heartbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          feature: {
            uptime: ['read'],
          },
          spaces: [space1Id],
        },
        {
          feature: {
            dashboard: ['all'],
          },
          spaces: [space2Id],
        },
      ],
    });
    spaceUserCookieHeader = spaceUserCredentials.cookieHeader;
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.spaces.delete(space1Id);
    await kbnClient.spaces.delete(space2Id);
  });

  apiTest('heartbeat-* read privileges only → 403', async ({ apiClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser({
      elasticsearch: {
        indices: [{ names: ['heartbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
    });

    const response = await apiClient.get('internal/uptime/pings', {
      headers: { ...credentials.cookieHeader, ...testData.COMMON_HEADERS },
      query: {
        sort: 'desc',
        from: testData.PINGS_DATE_RANGE_START,
        to: testData.PINGS_DATE_RANGE_END,
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(403);
  });

  apiTest('global all + heartbeat-* read → 200', async ({ apiClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser({
      elasticsearch: {
        indices: [{ names: ['heartbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [{ base: ['all'], spaces: ['*'] }],
    });

    const response = await apiClient.get('internal/uptime/pings', {
      headers: { ...credentials.cookieHeader, ...testData.COMMON_HEADERS },
      query: {
        sort: 'desc',
        from: testData.PINGS_DATE_RANGE_START,
        to: testData.PINGS_DATE_RANGE_END,
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);
  });

  apiTest('dashboard all + heartbeat-* read → 403', async ({ apiClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser({
      elasticsearch: {
        indices: [{ names: ['heartbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          feature: {
            dashboard: ['all'],
          },
          spaces: ['*'],
        },
      ],
    });

    const response = await apiClient.get('internal/uptime/pings', {
      headers: { ...credentials.cookieHeader, ...testData.COMMON_HEADERS },
      query: {
        sort: 'desc',
        from: testData.PINGS_DATE_RANGE_START,
        to: testData.PINGS_DATE_RANGE_END,
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(403);
  });

  apiTest('uptime read in space_1 can access pings API in space_1', async ({ apiClient }) => {
    const response = await apiClient.get(`s/${space1Id}/internal/uptime/pings`, {
      headers: { ...spaceUserCookieHeader, ...testData.COMMON_HEADERS },
      query: {
        sort: 'desc',
        from: testData.PINGS_DATE_RANGE_START,
        to: testData.PINGS_DATE_RANGE_END,
      },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);
  });

  apiTest(
    'uptime read in space_1 cannot access pings API in default space',
    async ({ apiClient }) => {
      const response = await apiClient.get('internal/uptime/pings', {
        headers: { ...spaceUserCookieHeader, ...testData.COMMON_HEADERS },
        query: {
          sort: 'desc',
          from: testData.PINGS_DATE_RANGE_START,
          to: testData.PINGS_DATE_RANGE_END,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(403);
    }
  );
});
