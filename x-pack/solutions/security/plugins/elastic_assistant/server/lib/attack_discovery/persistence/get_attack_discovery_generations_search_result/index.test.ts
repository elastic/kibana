/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetAttackDiscoveryGenerationsSearchResult } from '.';

const mockRawResponse = {
  aggregations: {
    generations: {
      buckets: [
        {
          alerts_context_count: { value: 5 },
          connector_id: {
            buckets: [{ key: 'connector-1', doc_count: 10 }],
          },
          discoveries: { value: 2 },
          doc_count: 10,
          event_actions: {
            buckets: [{ key: 'action-1', doc_count: 3 }],
          },
          event_reason: {
            buckets: [{ key: 'reason-1', doc_count: 1 }],
          },
          generation_end_time: { value_as_string: '2025-07-28T00:00:00.000Z' },
          generation_start_time: { value_as_string: '2025-07-27T00:00:00.000Z' },
          key: 'uuid-123',
          loading_message: {
            buckets: [{ key: 'Loading...', doc_count: 1 }],
          },
        },
      ],
    },
  },
};

describe('GetAttackDiscoveryGenerationsSearchResult schema', () => {
  it('returns a parsed result for a valid response', () => {
    const result = GetAttackDiscoveryGenerationsSearchResult.parse(mockRawResponse);

    expect(result.aggregations.generations.buckets[0].key).toBe('uuid-123');
  });

  describe('GetAttackDiscoveryGenerationsSearchResult schema edge cases', () => {
    const baseBucket = {
      alerts_context_count: { value: 5 },
      connector_id: { buckets: [{ key: 'connector-1', doc_count: 10 }] },
      discoveries: { value: 2 },
      doc_count: 10,
      event_actions: { buckets: [{ key: 'action-1', doc_count: 3 }] },
      event_reason: { buckets: [{ key: 'reason-1', doc_count: 1 }] },
      generation_end_time: { value_as_string: '2025-07-28T00:00:00.000Z' },
      generation_start_time: { value_as_string: '2025-07-27T00:00:00.000Z' },
      key: 'uuid-123',
      loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
    };

    it('returns a parsed result when alerts_context_count.value is null', () => {
      const response = {
        aggregations: {
          generations: {
            buckets: [{ ...baseBucket, alerts_context_count: { value: null } }],
          },
        },
      };
      const result = GetAttackDiscoveryGenerationsSearchResult.parse(response);

      expect(result.aggregations.generations.buckets[0].alerts_context_count.value).toBeNull();
    });

    it('returns a parsed result when discoveries.value is missing', () => {
      const bucket = { ...baseBucket, discoveries: {} };
      const response = {
        aggregations: { generations: { buckets: [bucket] } },
      };
      const result = GetAttackDiscoveryGenerationsSearchResult.parse(response);

      expect(result.aggregations.generations.buckets[0].discoveries.value).toBeUndefined();
    });

    it('returns a parsed result when generation_end_time.value_as_string is null', () => {
      const bucket = { ...baseBucket, generation_end_time: { value_as_string: null } };
      const response = {
        aggregations: { generations: { buckets: [bucket] } },
      };
      const result = GetAttackDiscoveryGenerationsSearchResult.parse(response);

      expect(
        result.aggregations.generations.buckets[0].generation_end_time.value_as_string
      ).toBeNull();
    });

    it('returns an error when generation_start_time is missing', () => {
      // Omit generation_start_time by destructuring
      const { generation_start_time: _generationStartTime, ...bucketWithoutStartTime } = baseBucket;
      const response = {
        aggregations: { generations: { buckets: [bucketWithoutStartTime] } },
      };

      expect(() => GetAttackDiscoveryGenerationsSearchResult.parse(response)).toThrow();
    });

    it('returns a parsed result for empty buckets array', () => {
      const response = {
        aggregations: { generations: { buckets: [] } },
      };
      const result = GetAttackDiscoveryGenerationsSearchResult.parse(response);

      expect(result.aggregations.generations.buckets).toEqual([]);
    });

    it('returns an error for missing aggregations', () => {
      const response = {};

      expect(() => GetAttackDiscoveryGenerationsSearchResult.parse(response)).toThrow();
    });

    it('returns an error for missing generations', () => {
      const response = { aggregations: {} };

      expect(() => GetAttackDiscoveryGenerationsSearchResult.parse(response)).toThrow();
    });

    it('returns an error for missing buckets', () => {
      const response = { aggregations: { generations: {} } };

      expect(() => GetAttackDiscoveryGenerationsSearchResult.parse(response)).toThrow();
    });

    it('returns a parsed result for multiple buckets', () => {
      const bucket1 = { ...baseBucket, key: 'uuid-1' };
      const bucket2 = { ...baseBucket, key: 'uuid-2' };
      const response = {
        aggregations: { generations: { buckets: [bucket1, bucket2] } },
      };
      const result = GetAttackDiscoveryGenerationsSearchResult.parse(response);

      expect(result.aggregations.generations.buckets.length).toBe(2);
    });
  });

  it('throws an error for an invalid response', () => {
    const invalidResponse = { aggregations: {} };

    expect(() => GetAttackDiscoveryGenerationsSearchResult.parse(invalidResponse)).toThrow();
  });
});
