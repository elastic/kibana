/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildObservedServiceDetailsQuery } from './query.observed_service_details.dsl';
import { mockOptions } from './__mocks__';

describe('buildServiceDetailsQuery', () => {
  test('build query from options correctly', () => {
    expect(buildObservedServiceDetailsQuery(mockOptions)).toMatchSnapshot();
  });

  test('defaults to a service.name term when no filter query is provided', () => {
    const query = buildObservedServiceDetailsQuery({ ...mockOptions, filterQuery: undefined });
    const filter = (query.query as { bool: { filter: unknown[] } }).bool.filter;

    expect(filter[0]).toEqual({ term: { 'service.name': mockOptions.serviceName } });
    expect(filter).toHaveLength(2);
  });

  test('uses the caller filter query instead of the service.name term when provided', () => {
    const groupFilter = { terms: { 'service.name': ['svc-a', 'svc-b'] } };
    const query = buildObservedServiceDetailsQuery({
      ...mockOptions,
      filterQuery: JSON.stringify(groupFilter),
    });
    const filter = (query.query as { bool: { filter: unknown[] } }).bool.filter;

    expect(filter[0]).toEqual(groupFilter);
    expect(filter).not.toContainEqual({ term: { 'service.name': mockOptions.serviceName } });
  });
});
