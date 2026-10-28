/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { DECISION_TREE_AI_INDEX_DEST } from '../../common/decision_trees';
import { createLearningStore } from './learning_store';

const TREE_ID = 'symptom:checkout-high-latency';

const createEsClient = () => ({
  index: jest.fn().mockResolvedValue({}),
  search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
});

const createStore = (esClient: ReturnType<typeof createEsClient>) =>
  createLearningStore({
    esClient: esClient as never,
    logger: loggerMock.create(),
    spaceId: 'default',
  });

describe('record', () => {
  it('writes a system learning under a single-slot id keyed by space, tree, and category', async () => {
    const esClient = createEsClient();

    const record = await createStore(esClient).record({
      kind: 'system',
      treeId: TREE_ID,
      category: 'architecture',
      content: 'Checkout writes through a shared connection pool.',
    });

    expect(record).toEqual(
      expect.objectContaining({
        kind: 'system',
        category: 'architecture',
        tree_id: TREE_ID,
      })
    );
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: 'default:dtree_learning_checkout-high-latency_system_architecture',
        document: expect.objectContaining({
          type: 'decision_tree_learning',
          tree_id: TREE_ID,
          attributes: { space_id: 'default', tree_id: TREE_ID },
        }),
      }),
      expect.anything()
    );
  });

  it('writes a tool learning id keyed by connector and category', async () => {
    const esClient = createEsClient();

    await createStore(esClient).record({
      kind: 'tool',
      treeId: TREE_ID,
      category: 'query_pattern',
      connectorName: 'elasticsearch',
      content: 'Filter by data_stream.dataset before aggregating.',
    });

    expect(esClient.index.mock.calls[0][0].id).toBe(
      'default:dtree_learning_checkout-high-latency_tool_query-pattern_elasticsearch'
    );
  });

  it('rejects an empty learning', async () => {
    const esClient = createEsClient();
    await expect(
      createStore(esClient).record({ kind: 'remediation', treeId: TREE_ID, content: '   ' })
    ).rejects.toThrow();
    expect(esClient.index).not.toHaveBeenCalled();
  });
});

describe('list', () => {
  it('maps learning documents back into records', async () => {
    const esClient = createEsClient();
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '2026-09-09T12:00:00.000Z',
              type: 'decision_tree_learning',
              title: 'Remediation',
              tags: ['nightshift', 'decision-tree', 'learning'],
              kind: 'remediation',
              tree_id: TREE_ID,
              content: 'Raise the pool size.',
              keywords: ['learning:remediation'],
            },
          },
        ],
      },
    });

    const learnings = await createStore(esClient).list();

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              { term: { type: 'decision_tree_learning' } },
              { term: { 'attributes.space_id': 'default' } },
            ],
          },
        },
      }),
      expect.anything()
    );
    expect(learnings).toEqual([
      {
        kind: 'remediation',
        tree_id: TREE_ID,
        content: 'Raise the pool size.',
        keywords: ['learning:remediation'],
      },
    ]);
  });
});
