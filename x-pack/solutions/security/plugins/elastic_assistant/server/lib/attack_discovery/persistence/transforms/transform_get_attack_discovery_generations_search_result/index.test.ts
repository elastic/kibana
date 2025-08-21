/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { transformGetAttackDiscoveryGenerationsSearchResult } from '.';

describe('transformGetAttackDiscoveryGenerationsSearchResult', () => {
  const logger = loggingSystemMock.createLogger();

  const validRawResponse = {
    aggregations: {
      generations: {
        buckets: [
          {
            key: 'exec-uuid-1',
            doc_count: 1,
            alerts_context_count: { value: 1 },
            connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
            discoveries: { value: 2 },
            event_actions: {
              buckets: [
                { key: 'generation-started', doc_count: 1 },
                { key: 'generation-succeeded', doc_count: 1 },
              ],
            },
            event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
            loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
            generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
            generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
          },
        ],
      },
    },
  };

  it('returns the expected transformed result', () => {
    const result = transformGetAttackDiscoveryGenerationsSearchResult({
      rawResponse: validRawResponse,
      logger,
    });

    expect(result.generations).toEqual([
      {
        alerts_context_count: 1,
        connector_id: 'test-connector',
        discoveries: 2,
        end: '2025-07-30T00:00:00Z',
        execution_uuid: 'exec-uuid-1',
        generation_start_time: '2025-07-29T00:00:00Z',
        loading_message: 'Loading...',
        reason: 'test-reason',
        start: '2025-07-29T00:00:00Z',
        status: 'succeeded',
      },
    ]);
  });

  it('returns an empty array when buckets is empty', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations).toEqual([]);
  });

  it('skips a bucket with a missing connector_id', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-2',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations.length).toBe(0);
  });

  it('throws when aggregations is missing', () => {
    // Pass the required shape but with aggregations as undefined
    const rawResponse = { aggregations: undefined };

    expect(() =>
      transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger })
    ).toThrow();
  });

  it('throws when a bucket is missing generation_start_time', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-3',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: { buckets: [{ key: 'generation-succeeded', doc_count: 1 }] },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              // generation_start_time missing
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
            },
          ],
        },
      },
    };

    expect(() =>
      transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger })
    ).toThrow();
  });

  it('returns the expected generations given two valid buckets', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-1',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
            {
              key: 'exec-uuid-2',
              doc_count: 1,
              alerts_context_count: { value: 2 },
              connector_id: { buckets: [{ key: 'test-connector-2', doc_count: 1 }] },
              discoveries: { value: 3 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason-2', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading2...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-31T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-30T00:00:00Z' },
            },
          ],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations).toEqual([
      {
        alerts_context_count: 1,
        connector_id: 'test-connector',
        discoveries: 2,
        end: '2025-07-30T00:00:00Z',
        execution_uuid: 'exec-uuid-1',
        generation_start_time: '2025-07-29T00:00:00Z',
        loading_message: 'Loading...',
        reason: 'test-reason',
        start: '2025-07-29T00:00:00Z',
        status: 'succeeded',
      },
      {
        alerts_context_count: 2,
        connector_id: 'test-connector-2',
        discoveries: 3,
        end: '2025-07-31T00:00:00Z',
        execution_uuid: 'exec-uuid-2',
        generation_start_time: '2025-07-30T00:00:00Z',
        loading_message: 'Loading2...',
        reason: 'test-reason-2',
        start: '2025-07-30T00:00:00Z',
        status: 'succeeded',
      },
    ]);
  });

  it('skips a bucket with a missing loading_message', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-4',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [] }, // empty buckets means no loading message
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations.length).toBe(0);
  });

  it('skips a bucket with a null executionUuid key', () => {
    // Since zod schema requires key to be string, this test should expect an error during parsing
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: null,
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    expect(() =>
      transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger })
    ).toThrow('Failed to parse search results');
  });

  describe('when buckets have undefined optional fields', () => {
    let result: ReturnType<typeof transformGetAttackDiscoveryGenerationsSearchResult>;
    beforeEach(() => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-5',
                doc_count: 1,
                alerts_context_count: { value: null }, // null value
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 }, // zero discoveries
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] }, // no event reason
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: null }, // null instead of missing
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
            ],
          },
        },
      };
      result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });
    });

    it('returns one generation', () => {
      expect(result.generations.length).toBe(1);
    });

    it('has an undefined alerts_context_count', () => {
      expect(result.generations[0].alerts_context_count).toBeUndefined();
    });

    it('has zero discoveries', () => {
      expect(result.generations[0].discoveries).toBe(0);
    });

    it('has an undefined reason', () => {
      expect(result.generations[0].reason).toBeUndefined();
    });

    it('has an undefined end', () => {
      expect(result.generations[0].end).toBeUndefined();
    });
  });

  describe('handles mixed valid and invalid buckets', () => {
    let result: ReturnType<typeof transformGetAttackDiscoveryGenerationsSearchResult>;
    beforeEach(() => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              // Valid bucket
              {
                key: 'exec-uuid-valid',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 2 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
              // Invalid bucket: missing connector_id
              {
                key: 'exec-uuid-invalid',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [] },
                discoveries: { value: 2 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
            ],
          },
        },
      };
      result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });
    });

    it('returns only one generation', () => {
      expect(result.generations.length).toBe(1);
    });

    it('has execution_uuid of exec-uuid-valid', () => {
      expect(result.generations[0].execution_uuid).toBe('exec-uuid-valid');
    });
  });

  it('verifies that debug logs are called for skipped buckets', () => {
    const mockLogger = loggingSystemMock.createLogger();
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-debug-test',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [] }, // missing connector_id will cause skip
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    transformGetAttackDiscoveryGenerationsSearchResult({
      rawResponse,
      logger: mockLogger,
    });

    expect(mockLogger.debug).toHaveBeenCalled();
  });

  describe('handles different generation statuses based on event actions', () => {
    let result: ReturnType<typeof transformGetAttackDiscoveryGenerationsSearchResult>;
    beforeEach(() => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              // Test "started" status (only generation-started action)
              {
                key: 'exec-uuid-running',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 },
                event_actions: {
                  buckets: [{ key: 'generation-started', doc_count: 1 }], // only started, not completed
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: null },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
              // Test "canceled" status
              {
                key: 'exec-uuid-canceled',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-canceled', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
            ],
          },
        },
      };
      result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });
    });

    it('returns two generations', () => {
      expect(result.generations.length).toBe(2);
    });

    it('has status "started" for exec-uuid-running', () => {
      const runningGeneration = result.generations.find(
        (g) => g.execution_uuid === 'exec-uuid-running'
      );

      expect(runningGeneration?.status).toBe('started');
    });

    it('has status "canceled" for exec-uuid-canceled', () => {
      const canceledGeneration = result.generations.find(
        (g) => g.execution_uuid === 'exec-uuid-canceled'
      );

      expect(canceledGeneration?.status).toBe('canceled');
    });
  });
});
