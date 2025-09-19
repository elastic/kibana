/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IScopedClusterClient } from '@kbn/core/server';
import { LifecycleQuery } from './lifecycle';
import type { ResolverSchema } from '../../../../../../common/endpoint/types';

describe('LifecycleQuery', () => {
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
      const query = new LifecycleQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      // Mock the Elasticsearch response
      client.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);

      await query.search(client, ['test-node-id']);

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
      const query = new LifecycleQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
        agentId: 'test-agent-id',
      });

      // Mock the Elasticsearch response
      client.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);

      await query.search(client, ['test-node-id']);

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

    it('should include standard process category filter', async () => {
      const query = new LifecycleQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      // Mock the Elasticsearch response
      client.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);

      await query.search(client, ['test-node-id']);

      const searchCall = client.asCurrentUser.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      // Verify required filters are present
      expect(filters).toEqual(
        expect.arrayContaining([
          { terms: { 'event.category': ['process'] } },
          { terms: { 'event.kind': ['event', 'alert', 'signal'] } },
        ])
      );
    });

    it('should use internal client when isInternalRequest is true', async () => {
      const query = new LifecycleQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: true,
        shouldExcludeColdAndFrozenTiers: false,
      });

      // Mock the Elasticsearch response
      client.asInternalUser.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);

      await query.search(client, ['test-node-id']);

      // Verify that the internal user client was used
      expect(client.asInternalUser.search).toHaveBeenCalled();
      expect(client.asCurrentUser.search).not.toHaveBeenCalled();
    });

    it('should return empty array for invalid node IDs', async () => {
      const query = new LifecycleQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      const result = await query.search(client, []);

      expect(result).toEqual([]);
      expect(client.asCurrentUser.search).not.toHaveBeenCalled();
    });

    it('should return mapped field results from Elasticsearch', async () => {
      const query = new LifecycleQuery({
        schema: baseSchema,
        indexPatterns,
        timeRange,
        isInternalRequest: false,
        shouldExcludeColdAndFrozenTiers: false,
      });

      const mockHits = [
        {
          fields: {
            'process.entity_id': ['node1'],
            'process.parent.entity_id': ['parent1'],
          },
        },
      ];

      client.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: mockHits,
        },
      } as any);

      const result = await query.search(client, ['node1']);

      expect(result).toEqual([
        {
          'process.entity_id': ['node1'],
          'process.parent.entity_id': ['parent1'],
        },
      ]);
    });
  });
});
