/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as dnsQuery from './query.dns_network.dsl';
import { networkDns } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

describe('networkDns search strategy', () => {
  let buildDnsQuerySpy: jest.SpyInstance;

  beforeEach(() => {
    buildDnsQuerySpy = jest.spyOn(dnsQuery, 'buildDnsQuery');
  });

  afterEach(() => {
    buildDnsQuerySpy.mockRestore();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      networkDns.buildDsl(mockOptions);
      expect(buildDnsQuerySpy).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await networkDns.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
