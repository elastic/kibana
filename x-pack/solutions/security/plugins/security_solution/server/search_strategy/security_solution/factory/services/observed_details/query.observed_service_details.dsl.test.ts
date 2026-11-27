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

  test('filters by service.name when no filter query is provided', () => {
    const query = buildObservedServiceDetailsQuery({ ...mockOptions, filterQuery: undefined });
    expect(query.query?.bool?.filter).toContainEqual({
      term: { 'service.name': mockOptions.serviceName },
    });
  });

  test('replaces the service.name term with the identity filter query when provided', () => {
    const query = buildObservedServiceDetailsQuery(mockOptions);
    expect(query.query?.bool?.filter).not.toContainEqual({
      term: { 'service.name': mockOptions.serviceName },
    });
  });
});
