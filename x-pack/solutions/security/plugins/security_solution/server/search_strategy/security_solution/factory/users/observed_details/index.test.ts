/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.observed_user_details.dsl';
import { observedUserDetails } from '.';
import { mockOptions, mockSearchStrategyResponse } from './__mocks__';

describe('userDetails search strategy', () => {
  const buildUserDetailsQuery = jest.spyOn(buildQuery, 'buildObservedUserDetailsQuery');

  afterEach(() => {
    buildUserDetailsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      observedUserDetails.buildDsl(mockOptions);
      expect(buildUserDetailsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await observedUserDetails.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchSnapshot();
    });
  });
});
