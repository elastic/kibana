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
});
