/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryGenerations } from '.';

import { authenticatedUser } from '../../../../__mocks__/user';

describe('getAttackDiscoveryGenerations', () => {
  const esClient = { msearch: jest.fn() } as { msearch: jest.Mock };
  interface Logger {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  }
  const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const eventLogIndex = 'test-index';
  const spaceId = 'default';
  // use imported authenticatedUser
  const generationsQuery = {
    allow_no_indices: true,
    index: eventLogIndex,
    ignore_unavailable: true,
    aggs: {},
    query: {},
    size: 10,
  };
  const getAttackDiscoveryGenerationsParams = { size: 10 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('returns the expected response', () => {
    let result: ReturnType<typeof getAttackDiscoveryGenerations> extends Promise<infer R>
      ? R
      : never;
    beforeEach(async () => {
      esClient.msearch.mockResolvedValue({
        responses: [
          {
            aggregations: {
              generations: {
                buckets: [
                  {
                    key: 'f29f3d04-14da-4660-8ac1-a6c95f618a7e',
                    doc_count: 1,
                    alerts_context_count: { value: 2 },
                    connector_id: { buckets: [{ key: 'claudeV3Haiku', doc_count: 1 }] },
                    discoveries: { value: 0 },
                    event_actions: {
                      buckets: [
                        { key: 'generation-started', doc_count: 1 },
                        { key: 'generation-failed', doc_count: 1 },
                      ],
                    },
                    event_reason: {
                      buckets: [
                        {
                          key: 'Maximum hallucination failures (5) reached. Try sending fewer alerts to this model.\n',
                          doc_count: 1,
                        },
                      ],
                    },
                    loading_message: {
                      buckets: [
                        {
                          key: 'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.',
                          doc_count: 1,
                        },
                      ],
                    },
                    generation_end_time: { value_as_string: '2025-06-26T21:23:04.604Z' },
                    generation_start_time: { value_as_string: '2025-06-26T21:19:06.317Z' },
                  },
                ],
              },
            },
          },
          {
            aggregations: {
              successfull_generations_by_connector_id: {
                buckets: [
                  {
                    key: 'claudeV3Haiku',
                    doc_count: 1,
                    event_actions: { buckets: [{ key: 'generation-succeeded', doc_count: 1 }] },
                    successful_generations: { value: 1 },
                    avg_event_duration_nanoseconds: { value: null },
                    latest_successfull_generation: { value: null, value_as_string: null },
                  },
                ],
              },
            },
          },
        ],
      });
      result = await getAttackDiscoveryGenerations({
        authenticatedUser,
        esClient: esClient as unknown as import('@kbn/core/server').ElasticsearchClient,
        eventLogIndex,
        generationsQuery,
        getAttackDiscoveryGenerationsParams,
        logger: logger as unknown as import('@kbn/core/server').Logger,
        spaceId,
      });
    });

    it('returns the one generation', () => {
      expect(result.generations.length).toBe(1);
    });

    it('returns the correct connector_id', () => {
      expect(result.generations[0].connector_id).toBe('claudeV3Haiku');
    });

    it('returns the correct discoveries', () => {
      expect(result.generations[0].discoveries).toBe(0);
    });

    it('returns the correct loading_message', () => {
      expect(result.generations[0].loading_message).toBe(
        'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.'
      );
    });

    it('returns the correct end', () => {
      expect(result.generations[0].end).toBe('2025-06-26T21:23:04.604Z');
    });

    it('returns the correct start', () => {
      expect(result.generations[0].start).toBe('2025-06-26T21:19:06.317Z');
    });

    it('returns the correct reason', () => {
      expect(result.generations[0].reason).toBe(
        'Maximum hallucination failures (5) reached. Try sending fewer alerts to this model.\n'
      );
    });
  });

  describe('handles multiple generations and connectors', () => {
    let result: ReturnType<typeof getAttackDiscoveryGenerations> extends Promise<infer R>
      ? R
      : never;
    beforeEach(async () => {
      esClient.msearch.mockResolvedValue({
        responses: [
          {
            aggregations: {
              generations: {
                buckets: [
                  {
                    key: 'uuid-1',
                    doc_count: 2,
                    alerts_context_count: { value: 5 },
                    connector_id: { buckets: [{ key: 'connA', doc_count: 2 }] },
                    discoveries: { value: 3 },
                    event_actions: {
                      buckets: [
                        { key: 'generation-started', doc_count: 1 },
                        { key: 'generation-succeeded', doc_count: 2 },
                      ],
                    },
                    event_reason: { buckets: [{ key: 'All good', doc_count: 2 }] },
                    loading_message: { buckets: [{ key: 'Done', doc_count: 2 }] },
                    generation_end_time: { value_as_string: '2025-07-25T10:00:00.000Z' },
                    generation_start_time: { value_as_string: '2025-07-25T09:00:00.000Z' },
                  },
                  {
                    key: 'uuid-2',
                    doc_count: 1,
                    alerts_context_count: { value: 1 },
                    connector_id: { buckets: [{ key: 'connB', doc_count: 1 }] },
                    discoveries: { value: 0 },
                    event_actions: {
                      buckets: [
                        { key: 'generation-started', doc_count: 1 },
                        { key: 'generation-failed', doc_count: 1 },
                      ],
                    },
                    event_reason: { buckets: [{ key: 'Timeout', doc_count: 1 }] },
                    loading_message: { buckets: [{ key: 'Processing', doc_count: 1 }] },
                    generation_end_time: { value_as_string: '2025-07-25T11:00:00.000Z' },
                    generation_start_time: { value_as_string: '2025-07-25T10:30:00.000Z' },
                  },
                ],
              },
            },
          },
          {
            aggregations: {
              successfull_generations_by_connector_id: {
                buckets: [
                  {
                    key: 'connA',
                    doc_count: 2,
                    event_actions: { buckets: [{ key: 'generation-succeeded', doc_count: 2 }] },
                    successful_generations: { value: 2 },
                    avg_event_duration_nanoseconds: { value: 1000000 },
                    latest_successfull_generation: {
                      value: 1721901600000,
                      value_as_string: '2025-07-25T10:00:00.000Z',
                    },
                  },
                  {
                    key: 'connB',
                    doc_count: 1,
                    event_actions: { buckets: [{ key: 'generation-succeeded', doc_count: 1 }] },
                    successful_generations: { value: 1 },
                    avg_event_duration_nanoseconds: { value: 2000000 },
                    latest_successfull_generation: {
                      value: 1721905200000,
                      value_as_string: '2025-07-25T11:00:00.000Z',
                    },
                  },
                ],
              },
            },
          },
        ],
      });
      result = await getAttackDiscoveryGenerations({
        authenticatedUser,
        esClient: esClient as unknown as import('@kbn/core/server').ElasticsearchClient,
        eventLogIndex,
        generationsQuery,
        getAttackDiscoveryGenerationsParams,
        logger: logger as unknown as import('@kbn/core/server').Logger,
        spaceId,
      });
    });

    it('returns the correct connector_id for the first generation', () => {
      expect(result.generations[0].connector_id).toBe('connA');
    });

    it('returns the correct connector_id for the second generation', () => {
      expect(result.generations[1].connector_id).toBe('connB');
    });

    it('returns the correct status for the first generation', () => {
      expect(result.generations[0].status).toBe('succeeded');
    });

    it('returns the correct status for the second generation', () => {
      expect(result.generations[1].status).toBe('failed');
    });
  });

  it('handles the empty buckets (no generations)', async () => {
    esClient.msearch.mockResolvedValue({
      responses: [
        {
          aggregations: {
            generations: {
              buckets: [],
            },
          },
        },
        {
          aggregations: {
            successfull_generations_by_connector_id: {
              buckets: [],
            },
          },
        },
      ],
    });

    const result = await getAttackDiscoveryGenerations({
      authenticatedUser,
      esClient: esClient as unknown as import('@kbn/core/server').ElasticsearchClient,
      eventLogIndex,
      generationsQuery,
      getAttackDiscoveryGenerationsParams,
      logger: logger as unknown as import('@kbn/core/server').Logger,
      spaceId,
    });

    expect(result.generations).toEqual([]);
  });

  describe('handles missing optional fields gracefully', () => {
    let result: ReturnType<typeof getAttackDiscoveryGenerations> extends Promise<infer R>
      ? R
      : never;
    beforeEach(async () => {
      esClient.msearch.mockResolvedValue({
        responses: [
          {
            aggregations: {
              generations: {
                buckets: [
                  {
                    key: 'uuid-3',
                    doc_count: 1,
                    alerts_context_count: { value: null },
                    connector_id: { buckets: [{ key: 'connC', doc_count: 1 }] },
                    discoveries: { value: null },
                    event_actions: {
                      buckets: [
                        { key: 'generation-started', doc_count: 1 },
                        { key: 'generation-succeeded', doc_count: 1 },
                      ],
                    },
                    event_reason: { buckets: [] },
                    loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                    generation_end_time: { value_as_string: null },
                    generation_start_time: { value_as_string: '2025-07-25T12:00:00.000Z' },
                  },
                ],
              },
            },
          },
          {
            aggregations: {
              successfull_generations_by_connector_id: {
                buckets: [
                  {
                    key: 'connC',
                    doc_count: 1,
                    event_actions: { buckets: [{ key: 'generation-succeeded', doc_count: 1 }] },
                    successful_generations: { value: 1 },
                    avg_event_duration_nanoseconds: { value: null },
                    latest_successfull_generation: { value: null, value_as_string: null },
                  },
                ],
              },
            },
          },
        ],
      });
      result = await getAttackDiscoveryGenerations({
        authenticatedUser,
        esClient: esClient as unknown as import('@kbn/core/server').ElasticsearchClient,
        eventLogIndex,
        generationsQuery,
        getAttackDiscoveryGenerationsParams,
        logger: logger as unknown as import('@kbn/core/server').Logger,
        spaceId,
      });
    });

    it('returns the correct connector_id', () => {
      expect(result.generations[0].connector_id).toBe('connC');
    });

    it('returns the undefined alerts_context_count', () => {
      expect(result.generations[0].alerts_context_count).toBeUndefined();
    });

    it('returns the discoveries as 0', () => {
      expect(result.generations[0].discoveries).toBe(0);
    });

    it('returns the undefined reason', () => {
      expect(result.generations[0].reason).toBeUndefined();
    });

    it('returns the loading_message as "Loading..."', () => {
      expect(result.generations[0].loading_message).toBe('Loading...');
    });

    it('returns the undefined end', () => {
      expect(result.generations[0].end).toBeUndefined();
    });

    it('returns the correct start', () => {
      expect(result.generations[0].start).toBe('2025-07-25T12:00:00.000Z');
    });
  });
});
