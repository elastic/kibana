/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.observed_service_details.dsl';
import { observedServiceDetails } from '.';
import { mockOptions, mockSearchStrategyResponse } from './__mocks__';

describe('serviceDetails search strategy', () => {
  const buildServiceDetailsQuery = jest.spyOn(buildQuery, 'buildObservedServiceDetailsQuery');

  afterEach(() => {
    buildServiceDetailsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      observedServiceDetails.buildDsl(mockOptions);
      expect(buildServiceDetailsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await observedServiceDetails.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchSnapshot();
    });
  });
});
