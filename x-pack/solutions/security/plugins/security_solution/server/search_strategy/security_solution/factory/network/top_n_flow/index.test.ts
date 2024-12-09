/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.top_n_flow_network.dsl';
import { networkTopNFlow, networkTopNFlowCount } from '.';
import {
  mockOptions,
  mockCountOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
  mockCountStrategyResponse,
  formattedCountStrategyResponse,
} from './__mocks__';

describe('Network TopNFlow search strategy', () => {
  describe('networkTopNFlow', () => {
    const buildTopNFlowQuery = jest.spyOn(buildQuery, 'buildTopNFlowQuery');

    afterEach(() => {
      buildTopNFlowQuery.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        networkTopNFlow.buildDsl(mockOptions);
        expect(buildTopNFlowQuery).toHaveBeenCalledWith(mockOptions);
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
    const buildTopNFlowCountQuery = jest.spyOn(buildQuery, 'buildTopNFlowCountQuery');

    afterEach(() => {
      buildTopNFlowCountQuery.mockClear();
    });

    describe('buildDsl', () => {
      test('should build dsl query', () => {
        networkTopNFlowCount.buildDsl(mockCountOptions);
        expect(buildTopNFlowCountQuery).toHaveBeenCalledWith(mockCountOptions);
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
