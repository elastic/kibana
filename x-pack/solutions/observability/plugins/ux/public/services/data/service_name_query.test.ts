/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseServiceNameApps, serviceNameQuery } from './service_name_query';

describe('serviceNameQuery', () => {
  it('fetches rum services', () => {
    expect(serviceNameQuery(0, 50000, {})).toMatchSnapshot();
  });
});

describe('parseServiceNameApps', () => {
  it('merges classic and otel services and prefers android', () => {
    expect(
      parseServiceNameApps({
        services: {
          buckets: [{ key: 'shop', rumPlatform: { buckets: [{ key: 'web' }] } }],
        },
        otelServices: {
          buckets: [
            { key: 'shop', rumPlatform: { buckets: [{ key: 'web' }] } },
            { key: 'weather-demo-app', osName: { buckets: [{ key: 'Android' }] } },
          ],
        },
      })
    ).toEqual([
      { name: 'shop', platform: 'web' },
      { name: 'weather-demo-app', platform: 'android' },
    ]);
  });
});
