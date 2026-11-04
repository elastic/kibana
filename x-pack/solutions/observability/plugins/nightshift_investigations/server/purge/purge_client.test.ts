/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { MEMORY_INDEX } from '../../common/memory';
import { CORTEX_AI_INDEX_DEST } from '../../common/cortex';
import { DECISION_TREE_AI_INDEX_DEST } from '../../common/decision_trees';
import { createKnowledgePurgeClient } from './purge_client';

const SINCE = '2026-01-10T00:00:00.000Z';

const conversation = (id: string, updatedAt: string) => ({
  id,
  title: `Investigation ${id}`,
  updated_at: updatedAt,
});

const indexNotFound = () =>
  new errors.ResponseError({
    statusCode: 404,
    body: { error: { type: 'index_not_found_exception' } },
    warnings: null,
    meta: {} as never,
  });

const setup = ({
  conversations,
  deleteConversation,
}: {
  conversations?: Array<ReturnType<typeof conversation>>;
  deleteConversation?: jest.Mock;
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const list = jest.fn().mockResolvedValue({ results: conversations ?? [] });
  const remove = deleteConversation ?? jest.fn().mockResolvedValue(true);
  const client = createKnowledgePurgeClient({
    esClient,
    logger,
    spaceId: 'marketing',
    getConversations: async () =>
      conversations === undefined
        ? undefined
        : ({ list, delete: remove } as unknown as ConversationPublicClient),
  });

  return { client, esClient, logger, list, remove };
};

describe('createKnowledgePurgeClient', () => {
  describe('preview', () => {
    it('counts every store for the caller space and lists the investigations', async () => {
      const { client, esClient } = setup({
        conversations: [
          conversation('inv-new', '2026-01-11T00:00:00.000Z'),
          conversation('inv-old', '2026-01-01T00:00:00.000Z'),
        ],
      });
      esClient.count.mockResolvedValue({ count: 3 } as never);

      await expect(client.preview(SINCE)).resolves.toEqual({
        since: SINCE,
        counts: {
          memory_pages: 3,
          cortex_pages: 3,
          decision_trees: 3,
          investigations: 1,
        },
        investigations: [
          { id: 'inv-new', title: 'Investigation inv-new', updated_at: '2026-01-11T00:00:00.000Z' },
        ],
        investigations_capped: false,
      });

      // Every store is filtered by space and by the cutoff, so another space is never counted.
      for (const index of [MEMORY_INDEX, CORTEX_AI_INDEX_DEST, DECISION_TREE_AI_INDEX_DEST]) {
        expect(esClient.count).toHaveBeenCalledWith(
          {
            index,
            query: {
              bool: {
                filter: [
                  { term: { 'attributes.space_id': 'marketing' } },
                  { range: { '@timestamp': { gte: SINCE } } },
                ],
              },
            },
          },
          expect.anything()
        );
      }
    });

    it('reports an empty store when the backing index was never created', async () => {
      const { client, esClient } = setup({ conversations: [] });
      esClient.count.mockRejectedValue(indexNotFound());

      const preview = await client.preview(SINCE);

      expect(preview.counts).toEqual({
        memory_pages: 0,
        cortex_pages: 0,
        decision_trees: 0,
        investigations: 0,
      });
    });

    it('leaves investigations alone when Agent Builder is unavailable', async () => {
      const { client, esClient } = setup();
      esClient.count.mockResolvedValue({ count: 1 } as never);

      const preview = await client.preview(SINCE);

      expect(preview.counts.investigations).toBe(0);
      expect(preview.investigations).toEqual([]);
    });
  });

  describe('purge', () => {
    it('deletes the documents written at or after the cutoff and the matching investigations', async () => {
      const { client, esClient, remove } = setup({
        conversations: [
          conversation('inv-new', '2026-01-11T00:00:00.000Z'),
          conversation('inv-old', '2026-01-01T00:00:00.000Z'),
        ],
      });
      esClient.deleteByQuery.mockResolvedValue({ deleted: 2 } as never);

      await expect(client.purge(SINCE)).resolves.toEqual({
        since: SINCE,
        deleted: {
          memory_pages: 2,
          cortex_pages: 2,
          decision_trees: 2,
          investigations: 1,
        },
        failures: [],
      });

      // Only the conversation written after the cutoff is removed.
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith('inv-new');
    });

    it('purges the other stores when one of them fails', async () => {
      const { client, esClient } = setup({ conversations: [] });
      esClient.deleteByQuery.mockImplementation((async ({ index }: { index: string }) => {
        if (index === MEMORY_INDEX) {
          throw new Error('memory is on fire');
        }
        return { deleted: 1 };
      }) as never);

      const result = await client.purge(SINCE);

      expect(result.deleted).toEqual({
        memory_pages: 0,
        cortex_pages: 1,
        decision_trees: 1,
        investigations: 0,
      });
      expect(result.failures).toEqual([{ scope: 'memory_pages', message: 'memory is on fire' }]);
    });

    it('counts only the conversations the delete actually removed', async () => {
      const { client, esClient } = setup({
        conversations: [
          conversation('inv-a', '2026-01-11T00:00:00.000Z'),
          conversation('inv-b', '2026-01-12T00:00:00.000Z'),
        ],
        deleteConversation: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      });
      esClient.deleteByQuery.mockResolvedValue({ deleted: 0 } as never);

      const result = await client.purge(SINCE);

      expect(result.deleted.investigations).toBe(1);
    });
  });
});
