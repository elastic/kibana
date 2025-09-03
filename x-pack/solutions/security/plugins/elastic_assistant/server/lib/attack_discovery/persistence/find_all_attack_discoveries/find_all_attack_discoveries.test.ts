/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findAllAttackDiscoveries } from './find_all_attack_discoveries';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';
import type { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

describe('findAllAttackDiscoveries', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: jest.Mocked<Logger>;
  const attackDiscoveryIndex = 'test-index';
  const user = mockAuthenticatedUser;

  beforeEach(() => {
    esClient = {
      search: jest.fn(),
    } as unknown as jest.Mocked<ElasticsearchClient>;
    logger = {
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  it('returns an empty array when the ES search returns no hits', async () => {
    const mockEsResponse: estypes.SearchResponse<unknown> = {
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        total: { value: 0, relation: 'eq' },
        max_score: null,
        hits: [],
      },
    };
    esClient.search.mockResolvedValue(mockEsResponse);

    const result = await findAllAttackDiscoveries({
      esClient,
      logger,
      attackDiscoveryIndex,
      user,
    });

    expect(result).toEqual([]);
  });

  it('returns the expected transformed attack discoveries when the ES search returns hits', async () => {
    const mockHit = {
      _id: 'test-id',
      _index: 'test-index',
      _source: {
        '@timestamp': '2023-01-01T00:00:00Z',
        alerts_context_count: 1,
        api_config: {
          action_type_id: 'aid',
          connector_id: 'cid',
          default_system_prompt_id: 'pid',
          model: 'model',
          provider: 'provider',
        },
        attack_discoveries: [
          {
            alert_ids: ['alert-1'],
            details_markdown: 'Details',
            entity_summary_markdown: 'Entity',
            id: 'ad-1',
            mitre_attack_tactics: ['Execution'],
            summary_markdown: 'Summary',
            timestamp: '2023-01-01T00:00:00Z',
            title: 'Attack Discovery 1',
          },
        ],
        created_at: '2023-01-01T00:00:00Z',
        last_viewed_at: '2023-01-01T00:00:00Z',
        namespace: 'default',
        status: 'active',
        updated_at: '2023-01-01T00:00:00Z',
        users: [
          {
            id: 'u1',
            name: 'user1',
          },
        ],
      },
    };
    const mockEsResponse: estypes.SearchResponse<unknown> = {
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        total: { value: 1, relation: 'eq' },
        max_score: 1,
        hits: [mockHit],
      },
    };
    esClient.search.mockResolvedValue(mockEsResponse);

    const result = await findAllAttackDiscoveries({
      esClient,
      logger,
      attackDiscoveryIndex,
      user,
    });

    expect(result).toEqual([
      {
        alertsContextCount: 1,
        apiConfig: {
          actionTypeId: 'aid',
          connectorId: 'cid',
          defaultSystemPromptId: 'pid',
          model: 'model',
          provider: 'provider',
        },
        attackDiscoveries: [
          {
            alertIds: ['alert-1'],
            detailsMarkdown: 'Details',
            entitySummaryMarkdown: 'Entity',
            id: 'ad-1',
            mitreAttackTactics: ['Execution'],
            summaryMarkdown: 'Summary',
            timestamp: '2023-01-01T00:00:00Z',
            title: 'Attack Discovery 1',
          },
        ],
        averageIntervalMs: 0,
        backingIndex: 'test-index',
        createdAt: '2023-01-01T00:00:00Z',
        generationIntervals: [],
        id: 'test-id',
        lastViewedAt: '2023-01-01T00:00:00Z',
        namespace: 'default',
        status: 'active',
        timestamp: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        users: [
          {
            id: 'u1',
            name: 'user1',
          },
        ],
      },
    ]);
  });

  describe('when ES search fails', () => {
    const error = new Error('ES error');

    beforeEach(() => {
      esClient.search.mockRejectedValue(error);
    });

    it('throws the error', async () => {
      await expect(
        findAllAttackDiscoveries({
          esClient,
          logger,
          attackDiscoveryIndex,
          user,
        })
      ).rejects.toThrow('ES error');
    });

    it('logs the error', async () => {
      try {
        await findAllAttackDiscoveries({
          esClient,
          logger,
          attackDiscoveryIndex,
          user,
        });
      } catch (e) {
        // error expected
      }
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching attack discoveries:')
      );
    });
  });
});
