/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTopNFlowQuery, buildTopNFlowCountQuery } from './query.top_n_flow_network.dsl';
import { networkTopNFlow, networkTopNFlowCount } from '.';
import {
  mockOptions,
  mockCountOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
  mockCountStrategyResponse,
  formattedCountStrategyResponse,
} from './__mocks__';

jest.mock('./query.top_n_flow_network.dsl');

describe('Network TopNFlow search strategy', () => {
  describe('networkTopNFlow', () => {
    const buildTopNFlowQueryMock = jest.mocked(buildTopNFlowQuery);

    afterEach(() => {
      buildTopNFlowQueryMock.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        networkTopNFlow.buildDsl(mockOptions);
        expect(buildTopNFlowQueryMock).toHaveBeenCalledWith(mockOptions);
      });
    });

    describe('parse', () => {
      test('should parse data correctly', async () => {
        const result = await networkTopNFlow.parse(mockOptions, mockSearchStrategyResponse);
        expect(result).toMatchObject(formattedSearchStrategyResponse);
      });
    });
  });

  describe('networkTopNFlowCount', () => {
    const buildTopNFlowCountQueryMock = jest.mocked(buildTopNFlowCountQuery);

    afterEach(() => {
      buildTopNFlowCountQueryMock.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        networkTopNFlowCount.buildDsl(mockCountOptions);
        expect(buildTopNFlowCountQueryMock).toHaveBeenCalledWith(mockCountOptions);
      });
    });

    describe('parse', () => {
      test('should parse data correctly', async () => {
        const result = await networkTopNFlowCount.parse(
          mockCountOptions,
          mockCountStrategyResponse
        );
        expect(result).toMatchObject(formattedCountStrategyResponse);
      });
    });
  });
});
