/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNetworkTlsQuery } from './query.tls_network.dsl';
import { networkTls } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

jest.mock('./query.tls_network.dsl');

describe('networkTls search strategy', () => {
  const buildNetworkTlsQueryMock = jest.mocked(buildNetworkTlsQuery);

  afterEach(() => {
    buildNetworkTlsQueryMock.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkTls.buildDsl(mockOptions);
      expect(buildNetworkTlsQueryMock).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkTls.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
