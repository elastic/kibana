/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitorDetailNavigatorParams } from './monitor_detail';

describe('monitorDetailNavigatorParams', () => {
  const { getLocation } = monitorDetailNavigatorParams;

  it('generates the correct path with only configId', async () => {
    const result = await getLocation({ configId: 'test-config-id' });
    expect(result).toEqual({
      app: 'synthetics',
      path: '/monitor/test-config-id',
      state: {},
    });
  });

  it('includes locationId in the query parameters', async () => {
    const result = await getLocation({
      configId: 'test-config-id',
      locationId: 'test-location-id',
    });
    expect(result).toEqual({
      app: 'synthetics',
      path: '/monitor/test-config-id?locationId=test-location-id',
      state: {},
    });
  });

  it('includes spaceId in the query parameters', async () => {
    const result = await getLocation({ configId: 'test-config-id', spaceId: 'test-space-id' });
    expect(result).toEqual({
      app: 'synthetics',
      path: '/monitor/test-config-id?spaceId=test-space-id',
      state: {},
    });
  });

  it('includes timeRange in the query parameters', async () => {
    const result = await getLocation({
      configId: 'test-config-id',
      timeRange: { from: 'now-15m', to: 'now' },
    });
    expect(result).toEqual({
      app: 'synthetics',
      path: '/monitor/test-config-id?dateRangeStart=now-15m&dateRangeEnd=now',
      state: {},
    });
  });

  it('includes tabId in the path', async () => {
    const result = await getLocation({ configId: 'test-config-id', tabId: 'test-tab-id' });
    expect(result).toEqual({
      app: 'synthetics',
      path: '/monitor/test-config-id/test-tab-id',
      state: {},
    });
  });

  it('combines all parameters correctly', async () => {
    const result = await getLocation({
      configId: 'test-config-id',
      locationId: 'test-location-id',
      spaceId: 'test-space-id',
      timeRange: { from: 'now-15m', to: 'now' },
      tabId: 'test-tab-id',
    });
    expect(result).toEqual({
      app: 'synthetics',
      path: '/monitor/test-config-id/test-tab-id?locationId=test-location-id&spaceId=test-space-id&dateRangeStart=now-15m&dateRangeEnd=now',
      state: {},
    });
  });
});
