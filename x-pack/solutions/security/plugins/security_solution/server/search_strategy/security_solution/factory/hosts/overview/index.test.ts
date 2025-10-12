/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOverviewHostQuery } from './query.overview_host.dsl';
import { hostOverview } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';

jest.mock('./query.overview_host.dsl');

describe('hostOverview search strategy', () => {
  const buildOverviewHostQueryMock = jest.mocked(buildOverviewHostQuery);

  afterEach(() => {
    buildOverviewHostQueryMock.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      hostOverview.buildDsl(mockOptions);
      expect(buildOverviewHostQueryMock).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await hostOverview.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
