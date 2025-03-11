/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usersRelatedHosts } from '.';
import { mockDeps, mockOptions, mockSearchStrategyResponse, mockRelatedHosts } from './__mocks__';
import { get } from 'lodash/fp';
import * as buildQuery from './query.related_hosts.dsl';

describe('usersRelatedHosts search strategy', () => {
  const buildRelatedHostsQuery = jest.spyOn(buildQuery, 'buildRelatedHostsQuery');

  afterEach(() => {
    buildRelatedHostsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      usersRelatedHosts.buildDsl(mockOptions);
      expect(buildRelatedHostsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await usersRelatedHosts.parse(mockOptions, mockSearchStrategyResponse);
      expect(result.relatedHosts).toMatchObject(mockRelatedHosts);
      expect(result.totalCount).toBe(2);
    });

    test('should enhance data with risk score', async () => {
      const risk = 'TEST_RISK_SCORE';
      const hostName: string = get(
        `aggregations.host_data.buckets[0].key`,
        mockSearchStrategyResponse.rawResponse
      );

      const mockedDeps = mockDeps();

      mockedDeps.esClient.asCurrentUser.search.mockResponse({
        hits: {
          hits: [
            {
              _id: 'id',
              _index: 'index',
              _source: {
                risk,
                host: {
                  name: hostName,
                  risk: {
                    multipliers: [],
                    calculated_score_norm: 9999,
                    calculated_level: risk,
                    rule_risks: [],
                  },
                },
              },
            },
          ],
        },
        took: 2,
        _shards: { failed: 0, successful: 2, total: 2 },
        timed_out: false,
      });

      const result = await usersRelatedHosts.parse(
        mockOptions,
        mockSearchStrategyResponse,
        mockedDeps
      );

      expect(result.relatedHosts[0].risk).toBe(risk);
    });

    test("should not enhance data when space id doesn't exist", async () => {
      const mockedDeps = mockDeps();
      const result = await usersRelatedHosts.parse(mockOptions, mockSearchStrategyResponse, {
        ...mockedDeps,
        spaceId: undefined,
      });

      expect(result.relatedHosts[0].risk).toBeUndefined();
    });
  });
});
