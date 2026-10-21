/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceNames, serviceNameQuery } from './service_name_query';

describe('serviceNameQuery', () => {
  it('fetches rum services', () => {
    expect(serviceNameQuery(0, 50000, {})).toMatchSnapshot();
  });
});

describe('getServiceNames', () => {
  it('returns the service name of each bucket', () => {
    expect(getServiceNames({ services: { buckets: [{ key: 'shop' }, { key: 'blog' }] } })).toEqual([
      'shop',
      'blog',
    ]);
  });

  it('returns no names without aggregations', () => {
    expect(getServiceNames(undefined)).toEqual([]);
  });
});
