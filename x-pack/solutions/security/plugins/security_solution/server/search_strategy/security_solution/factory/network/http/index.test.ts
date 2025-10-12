/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildHttpQuery } from './query.http_network.dsl';
import { networkHttp } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

jest.mock('./query.http_network.dsl');

describe('networkHttp search strategy', () => {
  const buildHttpQueryMock = jest.mocked(buildHttpQuery);

  afterEach(() => {
    buildHttpQueryMock.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkHttp.buildDsl(mockOptions);
      expect(buildHttpQueryMock).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkHttp.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
