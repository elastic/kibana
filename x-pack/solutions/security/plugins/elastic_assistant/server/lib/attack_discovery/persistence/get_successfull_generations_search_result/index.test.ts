/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSuccessfulGenerationsSearchResult } from '.';
import { getMockSuccessfulGenerationsSearchResult } from '../../../../__mocks__/get_successful_generations_search_result.mock';

describe('GetSuccessfulGenerationsSearchResult schema', () => {
  it('successfully parses a valid raw response', () => {
    const parsed = GetSuccessfulGenerationsSearchResult.safeParse(
      getMockSuccessfulGenerationsSearchResult()
    );

    expect(parsed.success).toBe(true);
  });

  it('returns parsed = false for a missing aggregations field', () => {
    const invalidResponse = {};
    const parsed = GetSuccessfulGenerationsSearchResult.safeParse(invalidResponse);

    expect(parsed.success).toBe(false);
  });

  it('returns invalid for wrong bucket key type', () => {
    const invalidResponse = {
      aggregations: {
        successfull_generations_by_connector_id: {
          buckets: [
            {
              key: 123, // should be string
              doc_count: 5,
              event_actions: { buckets: [] },
              successful_generations: { value: 3 },
              avg_event_duration_nanoseconds: { value: 1000000 },
              latest_successfull_generation: { value: null, value_as_string: null },
            },
          ],
        },
      },
    };

    const parsed = GetSuccessfulGenerationsSearchResult.safeParse(invalidResponse);

    expect(parsed.success).toBe(false);
  });

  describe('table-driven edge cases', () => {
    const cases = [
      {
        name: 'returns valid for nullable avg_event_duration_nanoseconds',
        input: {
          aggregations: {
            successfull_generations_by_connector_id: {
              buckets: [
                {
                  key: 'connector-2',
                  doc_count: 1,
                  event_actions: { buckets: [] },
                  successful_generations: { value: 1 },
                  avg_event_duration_nanoseconds: { value: null },
                  latest_successfull_generation: { value: null, value_as_string: null },
                },
              ],
            },
          },
        },
        expected: true,
      },
      {
        name: 'returns valid for empty buckets',
        input: {
          aggregations: {
            successfull_generations_by_connector_id: {
              buckets: [],
            },
          },
        },
        expected: true,
      },
      {
        name: 'returns invalid for missing buckets',
        input: {
          aggregations: {
            successfull_generations_by_connector_id: {},
          },
        },
        expected: false,
      },
      {
        name: 'returns valid for multiple connectors',
        input: {
          aggregations: {
            successfull_generations_by_connector_id: {
              buckets: [
                {
                  key: 'connector-1',
                  doc_count: 2,
                  event_actions: { buckets: [] },
                  successful_generations: { value: 1 },
                  avg_event_duration_nanoseconds: { value: 1000 },
                  latest_successfull_generation: {
                    value: 123,
                    value_as_string: '2021-01-01T00:00:00Z',
                  },
                },
                {
                  key: 'connector-2',
                  doc_count: 3,
                  event_actions: { buckets: [] },
                  successful_generations: { value: 2 },
                  avg_event_duration_nanoseconds: { value: null },
                  latest_successfull_generation: { value: null, value_as_string: null },
                },
              ],
            },
          },
        },
        expected: true,
      },
    ];

    cases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const parsed = GetSuccessfulGenerationsSearchResult.safeParse(input);
        expect(parsed.success).toBe(expected);
      });
    });
  });
});
