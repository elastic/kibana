/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNetworkDetailsQuery } from './query.details_network.dsl';
import { networkDetails } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

jest.mock('./query.details_network.dsl');

describe('networkDetails search strategy', () => {
  const buildNetworkDetailsQueryMock = jest.mocked(buildNetworkDetailsQuery);

  afterEach(() => {
    buildNetworkDetailsQueryMock.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkDetails.buildDsl(mockOptions);
      expect(buildNetworkDetailsQueryMock).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkDetails.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toEqual(formattedSearchStrategyResponse);
    });
  });
});
