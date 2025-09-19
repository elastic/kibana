/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IScopedClusterClient } from '@kbn/core/server';
import { StatsQuery } from './stats';
import type { ResolverSchema } from '../../../../../../common/endpoint/types';

describe('StatsQuery', () => {
  let client: jest.Mocked<IScopedClusterClient>;
  const indexPatterns = ['logs-*'];
  const timeRange = { from: '2023-01-01T00:00:00.000Z', to: '2023-01-02T00:00:00.000Z' };

  const baseSchema: ResolverSchema = {
    id: 'process.entity_id',
    parent: 'process.parent.entity_id',
    agentId: 'agent.id',
  };

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('query generation', () => {
    it('should include signal in event.kind filter', async () => {
      const query = new StatsQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
      });

      // Mock the Elasticsearch response
      client.asCurrentUser.search.mockResolvedValue({
        aggregations: {
          ids: {
            buckets: [],
          },
        },
      } as any);

      await query.search(client, ['test-node-id'], undefined, false);

      // Verify that the search was called with the correct query including signal
      expect(client.asCurrentUser.search).toHaveBeenCalledWith({
        body: expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                {
                  terms: { 'event.kind': ['event', 'alert', 'signal'] },
                },
              ]),
            },
          },
        }),
        index: indexPatterns,
      });
    });

    it('should include agent.id filter when agentId is provided', async () => {
      const query = new StatsQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        agentId: 'test-agent-id',
      });

      // Mock the Elasticsearch response
      client.asCurrentUser.search.mockResolvedValue({
        aggregations: {
          ids: {
            buckets: [],
          },
        },
      } as any);

      await query.search(client, ['test-node-id'], undefined, false);

      // Verify that the search was called with agent.id filter
      expect(client.asCurrentUser.search).toHaveBeenCalledWith({
        body: expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                {
                  term: { 'agent.id': 'test-agent-id' },
                },
              ]),
            },
          },
        }),
        index: indexPatterns,
      });
    });

    it('should not include agent.id filter when agentId is not provided', async () => {
      const query = new StatsQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
      });

      // Mock the Elasticsearch response
      client.asCurrentUser.search.mockResolvedValue({
        aggregations: {
          ids: {
            buckets: [],
          },
        },
      } as any);

      await query.search(client, ['test-node-id'], undefined, false);

      const searchCall = client.asCurrentUser.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      // Verify that agent.id filter is not present
      expect(filters).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            term: expect.objectContaining({
              'agent.id': expect.anything(),
            }),
          }),
        ])
      );
    });

    it('should use internal client when isInternalRequest is true', async () => {
      const query = new StatsQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: true,
      });

      // Mock the Elasticsearch response
      client.asInternalUser.search.mockResolvedValue({
        aggregations: {
          ids: {
            buckets: [],
          },
        },
      } as any);

      await query.search(client, ['test-node-id'], undefined, false);

      // Verify that the internal user client was used
      expect(client.asInternalUser.search).toHaveBeenCalled();
      expect(client.asCurrentUser.search).not.toHaveBeenCalled();
    });

    it('should return empty result for empty node IDs', async () => {
      const query = new StatsQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
      });

      const result = await query.search(client, [], undefined, false);

      expect(result).toEqual({});
      expect(client.asCurrentUser.search).not.toHaveBeenCalled();
    });

    it('should handle aggregation results correctly', async () => {
      const query = new StatsQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
      });

      const mockResponse = {
        aggregations: {
          ids: {
            buckets: [
              {
                key: 'node1',
                doc_count: 8, // This is required for the total calculation
                categories: {
                  buckets: [
                    {
                      key: 'process',
                      doc_count: 5,
                    },
                    {
                      key: 'file',
                      doc_count: 3,
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      client.asCurrentUser.search.mockResolvedValue(mockResponse as any);

      const result = await query.search(client, ['node1'], undefined, false);

      expect(result.eventStats).toEqual({
        node1: {
          total: 8,
          byCategory: {
            process: 5,
            file: 3,
          },
        },
      });
    });
  });
});
