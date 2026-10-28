/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import {
  countsForTree,
  parseMermaidDecisionTree,
  recordVisit,
} from '@kbn/nightshift-decision-trees';
import type { DecisionTreeCounts, LearningRecord } from '@kbn/nightshift-decision-trees';
import { DECISION_TREE_AI_INDEX_DEST } from '../../common/decision_trees';
import { createDecisionTreeStore } from './store';

const MERMAID = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|yes| X1((Connection leak))
    D1 -->|no| X2((Slow query))`;

const MARKDOWN = `# Checkout high latency\n\n\`\`\`mermaid\n${MERMAID}\n\`\`\`\n`;

const TREE = parseMermaidDecisionTree(MERMAID, 'symptom:checkout-high-latency');

const zeroCounts = () => countsForTree(TREE);

const VISIT = [
  { source_node_id: 'S1', target_node_id: 'E1' },
  { source_node_id: 'E1', target_node_id: 'D1' },
];

const NOW = '2026-10-21T10:00:00.000Z';

const conflict = () =>
  new errors.ResponseError({
    statusCode: 409,
    body: { error: { type: 'version_conflict_engine_exception' } },
  } as never);

const headSource = (overrides: { version?: number; counts?: DecisionTreeCounts } = {}) => ({
  '@timestamp': '2026-09-09T12:00:00.000Z',
  type: 'decision_tree',
  title: 'Checkout High Latency',
  content: MARKDOWN,
  tags: ['nightshift', 'decision-tree'],
  attributes: {
    tree_id: 'symptom:checkout-high-latency',
    symptom: 'checkout-high-latency',
    version: overrides.version ?? 1,
    status: 'tentative',
    node_count: 5,
    edge_count: 4,
  },
  learnings: [],
  ...(overrides.counts ? { counts: overrides.counts } : {}),
});

const storedHead = (
  overrides: { version?: number; counts?: DecisionTreeCounts; seqNo?: number } = {}
) => ({
  found: true,
  _seq_no: overrides.seqNo ?? 7,
  _primary_term: 1,
  _source: headSource(overrides),
});

const learning: LearningRecord = {
  kind: 'remediation',
  content: 'Raise the pool size.',
  keywords: [],
};

const createEsClient = () => ({
  get: jest.fn().mockResolvedValue({ found: false }),
  search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
  index: jest.fn().mockResolvedValue({}),
});

const createStore = (esClient: ReturnType<typeof createEsClient>) =>
  createDecisionTreeStore({
    esClient: esClient as never,
    logger: loggerMock.create(),
    spaceId: 'default',
  });

describe('commit', () => {
  it('creates version 1 and a head for a new tree', async () => {
    const esClient = createEsClient();

    const detail = await createStore(esClient).commit({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: false,
      author: 'jdoe',
      summary: 'Initial tree.',
      learnings: [learning],
      evidenceGathererMetadata: [],
      updateCounts: zeroCounts,
    });

    expect(detail.version).toBe(1);
    expect(detail.status).toBe('tentative');
    expect(detail.node_count).toBe(TREE.nodes.length);
    expect(detail.learnings).toEqual([learning]);
    expect(detail.evidence_gatherer_metadata).toEqual([]);

    // The head is written first: winning that write is what claims the version number.
    const [headCall, versionCall] = esClient.index.mock.calls;
    expect(versionCall[0]).toMatchObject({
      index: DECISION_TREE_AI_INDEX_DEST,
      id: 'default:dtree_checkout-high-latency_v1',
      document: expect.objectContaining({
        type: 'decision_tree_version',
        content: MARKDOWN,
        attributes: expect.objectContaining({
          version: 1,
          author: 'jdoe',
          summary: 'Initial tree.',
          space_id: 'default',
        }),
        learnings: [learning],
        evidence_gatherer_metadata: [],
      }),
    });
    expect(headCall[0]).toMatchObject({
      index: DECISION_TREE_AI_INDEX_DEST,
      id: 'default:dtree_checkout-high-latency',
      document: expect.objectContaining({
        type: 'decision_tree',
        content: MARKDOWN,
        attributes: expect.objectContaining({ version: 1 }),
      }),
    });
  });

  it('indexes without creating the backing index first', async () => {
    const esClient = createEsClient();
    const indices = { create: jest.fn(), exists: jest.fn() };
    (esClient as typeof esClient & { indices: typeof indices }).indices = indices;

    await createStore(esClient).commit({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: false,
      author: 'jdoe',
      summary: 'Initial tree.',
      learnings: [],
      evidenceGathererMetadata: [],
      updateCounts: zeroCounts,
    });

    expect(indices.create).not.toHaveBeenCalled();
    expect(indices.exists).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalled();
  });

  it('increments the version from the existing head', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: ['nightshift', 'decision-tree'],
        attributes: {
          tree_id: 'symptom:checkout-high-latency',
          symptom: 'checkout-high-latency',
          version: 2,
          status: 'tentative',
          node_count: 5,
          edge_count: 4,
        },
        learnings: [],
      },
    });

    const detail = await createStore(esClient).commit({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: true,
      author: 'jdoe',
      summary: 'Reinforced.',
      learnings: [],
      evidenceGathererMetadata: [],
      updateCounts: zeroCounts,
    });

    expect(detail.version).toBe(3);
    // A confirmed causal path promotes the tree to established.
    expect(detail.status).toBe('established');
    expect(esClient.index.mock.calls[1][0].id).toBe('default:dtree_checkout-high-latency_v3');
  });

  it('merges learnings single-slot into the head', async () => {
    const esClient = createEsClient();
    const existingLearning: LearningRecord = {
      kind: 'system',
      category: 'dependency',
      content: 'Old fact.',
      keywords: [],
    };
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: ['nightshift', 'decision-tree'],
        attributes: {
          tree_id: 'symptom:checkout-high-latency',
          symptom: 'checkout-high-latency',
          version: 1,
          status: 'tentative',
          node_count: 5,
          edge_count: 4,
        },
        learnings: [existingLearning],
      },
    });

    const updatedSystem: LearningRecord = {
      kind: 'system',
      category: 'dependency',
      content: 'New fact.',
      keywords: [],
    };

    const detail = await createStore(esClient).commit({
      treeId: 'symptom:checkout-high-latency',
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: false,
      author: 'jdoe',
      summary: '',
      learnings: [updatedSystem, learning],
      evidenceGathererMetadata: ['E1: Query checkout logs in logs-*'],
      updateCounts: zeroCounts,
    });

    // The dependency slot is replaced, the remediation slot is added: two learnings, not three.
    expect(detail.learnings).toEqual([updatedSystem, learning]);
    expect(detail.evidence_gatherer_metadata).toEqual(['E1: Query checkout logs in logs-*']);
    expect(esClient.index.mock.calls[0][0].document.evidence_gatherer_metadata).toEqual([
      'E1: Query checkout logs in logs-*',
    ]);
  });
});

describe('list', () => {
  it('maps head hits to summaries', async () => {
    const esClient = createEsClient();
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '2026-09-09T12:00:00.000Z',
              type: 'decision_tree',
              title: 'Checkout High Latency',
              content: MARKDOWN,
              tags: ['nightshift', 'decision-tree'],
              attributes: {
                tree_id: 'symptom:checkout-high-latency',
                symptom: 'checkout-high-latency',
                version: 2,
                status: 'established',
                node_count: 5,
                edge_count: 4,
              },
              learnings: [learning],
            },
          },
        ],
      },
    });

    const trees = await createStore(esClient).list();

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([{ term: { 'attributes.space_id': 'default' } }]),
          },
        },
      }),
      expect.anything()
    );

    expect(trees).toEqual([
      expect.objectContaining({
        tree_id: 'symptom:checkout-high-latency',
        symptom: 'checkout-high-latency',
        version: 2,
        status: 'established',
        learning_count: 1,
      }),
    ]);
  });
});

describe('listVersions', () => {
  it('filters versions by the flattened tree_id attribute', async () => {
    const esClient = createEsClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } });

    await createStore(esClient).listVersions('symptom:checkout-high-latency');

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              { term: { type: 'decision_tree_version' } },
              { term: { 'attributes.tree_id': 'symptom:checkout-high-latency' } },
              { term: { 'attributes.space_id': 'default' } },
            ],
          },
        },
      }),
      expect.anything()
    );
  });
});

describe('get', () => {
  it('extracts the mermaid from the head content', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: [],
        attributes: {
          tree_id: 'symptom:checkout-high-latency',
          symptom: 'checkout-high-latency',
          version: 1,
          status: 'tentative',
          node_count: 5,
          edge_count: 4,
        },
        learnings: [],
        evidence_gatherer_metadata: ['E1: Query checkout logs in logs-*'],
      },
    });

    const tree = await createStore(esClient).get('symptom:checkout-high-latency');

    expect(esClient.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'default:dtree_checkout-high-latency' }),
      expect.anything()
    );
    expect(tree?.markdown).toBe(MARKDOWN);
    expect(tree?.mermaid).toContain('flowchart TD');
    expect(tree?.evidence_gatherer_metadata).toEqual(['E1: Query checkout logs in logs-*']);
  });

  it('returns undefined when the head is missing', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({ found: false });
    expect(await createStore(esClient).get('symptom:missing-tree')).toBeUndefined();
  });
});

describe('getVersion', () => {
  it('reads a version snapshot by its derived id', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree_version',
        title: 'Checkout High Latency v2',
        tags: [],
        content: MARKDOWN,
        attributes: {
          tree_id: 'symptom:checkout-high-latency',
          symptom: 'checkout-high-latency',
          version: 2,
          author: 'jdoe',
          summary: 'Reinforced.',
          reinforced: true,
          node_count: 5,
          edge_count: 4,
        },
        learnings: [],
      },
    });

    const version = await createStore(esClient).getVersion('symptom:checkout-high-latency', 2);

    expect(esClient.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'default:dtree_checkout-high-latency_v2' }),
      expect.anything()
    );
    expect(version?.version).toBe(2);
    expect(version?.markdown).toBe(MARKDOWN);
    expect(version?.mermaid).toContain('flowchart TD');
  });
});

describe('archive', () => {
  it('flips the head status without adding a version', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        '@timestamp': '2026-09-09T12:00:00.000Z',
        type: 'decision_tree',
        title: 'Checkout High Latency',
        content: MARKDOWN,
        tags: [],
        attributes: {
          tree_id: 'symptom:checkout-high-latency',
          symptom: 'checkout-high-latency',
          version: 2,
          status: 'established',
          node_count: 5,
          edge_count: 4,
        },
        learnings: [],
      },
    });

    await createStore(esClient).archive('symptom:checkout-high-latency');

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default:dtree_checkout-high-latency',
        document: expect.objectContaining({
          attributes: expect.objectContaining({ status: 'archived', version: 2 }),
        }),
      }),
      expect.anything()
    );
  });
});

describe('counts', () => {
  const visited = recordVisit({ tree: TREE, path: VISIT, now: NOW });

  const commitInput = (updateCounts: jest.Mock) => ({
    treeId: 'symptom:checkout-high-latency',
    markdown: MARKDOWN,
    tree: TREE,
    reinforced: false,
    author: 'jdoe',
    summary: '',
    learnings: [],
    evidenceGathererMetadata: [],
    updateCounts,
  });

  it('builds the commit counts from the stored head and writes them to head and version', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue(storedHead({ counts: visited }));
    const updateCounts = jest.fn().mockReturnValue(visited);

    const detail = await createStore(esClient).commit(commitInput(updateCounts));

    expect(updateCounts).toHaveBeenCalledWith({
      tree: expect.objectContaining({ tree_id: 'symptom:checkout-high-latency' }),
      counts: visited,
    });
    const [headCall, versionCall] = esClient.index.mock.calls;
    expect(headCall[0].document.counts).toEqual(visited);
    expect(versionCall[0].document.counts).toEqual(visited);
    expect(detail.counts).toEqual(visited);
  });

  it('passes no previous state for a new tree and creates its head only if still absent', async () => {
    const esClient = createEsClient();
    const updateCounts = jest.fn().mockReturnValue(zeroCounts());

    await createStore(esClient).commit(commitInput(updateCounts));

    expect(updateCounts).toHaveBeenCalledWith(undefined);
    expect(esClient.index.mock.calls[0][0]).toMatchObject({ op_type: 'create' });
  });

  it('writes an existing head only if it is unchanged since it was read', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue(storedHead({ seqNo: 7 }));

    await createStore(esClient).commit(commitInput(jest.fn().mockReturnValue(zeroCounts())));

    expect(esClient.index.mock.calls[0][0]).toMatchObject({ if_seq_no: 7, if_primary_term: 1 });
  });

  it('retries a lost head race against the newer head, recomputing counts and version', async () => {
    const esClient = createEsClient();
    esClient.get
      .mockResolvedValueOnce(storedHead({ version: 1, seqNo: 7 }))
      .mockResolvedValueOnce(storedHead({ version: 2, seqNo: 8, counts: visited }));
    esClient.index.mockRejectedValueOnce(conflict());
    const updateCounts = jest.fn().mockReturnValue(visited);

    const detail = await createStore(esClient).commit(commitInput(updateCounts));

    expect(updateCounts).toHaveBeenCalledTimes(2);
    expect(updateCounts.mock.calls[1][0].counts).toEqual(visited);
    expect(detail.version).toBe(3);
    const versionWrites = esClient.index.mock.calls.filter(
      ([request]) => request.document.type === 'decision_tree_version'
    );
    expect(versionWrites.map(([request]) => request.id)).toEqual([
      'default:dtree_checkout-high-latency_v3',
    ]);
  });

  it('retries the version document without applying the counts a second time', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue(storedHead({ counts: visited }));
    esClient.index
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('version shard unavailable'))
      .mockResolvedValueOnce({});
    const updateCounts = jest.fn().mockReturnValue(visited);

    await createStore(esClient).commit(commitInput(updateCounts));

    expect(updateCounts).toHaveBeenCalledTimes(1);
    const versionWrites = esClient.index.mock.calls.filter(
      ([request]) => request.document.type === 'decision_tree_version'
    );
    expect(versionWrites).toHaveLength(2);
    expect(versionWrites.map(([request]) => request.id)).toEqual([
      'default:dtree_checkout-high-latency_v2',
      'default:dtree_checkout-high-latency_v2',
    ]);
  });

  it('gives up after repeated conflicts without writing a version', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue(storedHead());
    esClient.index.mockRejectedValue(conflict());

    await expect(
      createStore(esClient).commit(commitInput(jest.fn().mockReturnValue(zeroCounts())))
    ).rejects.toThrow();

    expect(esClient.index).toHaveBeenCalledTimes(5);
    expect(
      esClient.index.mock.calls.every(([request]) => request.document.type === 'decision_tree')
    ).toBe(true);
  });

  it('reads zero counts for a head written before counts existed', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue(storedHead());

    const tree = await createStore(esClient).get('symptom:checkout-high-latency');

    expect(tree?.counts).toEqual(zeroCounts());
  });

  it('returns the counts snapshot stored on a version', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue({
      found: true,
      _source: {
        ...headSource({ counts: visited }),
        type: 'decision_tree_version',
        title: 'Checkout High Latency v1',
      },
    });

    const version = await createStore(esClient).getVersion('symptom:checkout-high-latency', 1);

    expect(version?.counts).toEqual(visited);
  });

  describe('updateCounts', () => {
    it('rewrites only the head counts, keeping the tree and its last-edit time', async () => {
      const esClient = createEsClient();
      esClient.get.mockResolvedValue(storedHead({ counts: visited, seqNo: 9 }));
      const update = jest.fn(({ tree, counts }) =>
        recordVisit({ tree, counts, path: VISIT, now: NOW })
      );

      const detail = await createStore(esClient).updateCounts({
        treeId: 'symptom:checkout-high-latency',
        update,
      });

      expect(update).toHaveBeenCalledWith({ tree: expect.anything(), counts: visited });
      expect(esClient.index).toHaveBeenCalledTimes(1);
      const [[request]] = esClient.index.mock.calls;
      expect(request).toMatchObject({
        id: 'default:dtree_checkout-high-latency',
        if_seq_no: 9,
        document: expect.objectContaining({
          '@timestamp': '2026-09-09T12:00:00.000Z',
          content: MARKDOWN,
          attributes: expect.objectContaining({ version: 1, status: 'tentative' }),
        }),
      });
      expect(detail?.counts.nodes.find((node) => node.node_id === 'E1')?.visit_count).toBe(2);
    });

    it('promotes the tree to established when the update reinforces it', async () => {
      const esClient = createEsClient();
      esClient.get.mockResolvedValue(storedHead());

      const detail = await createStore(esClient).updateCounts({
        treeId: 'symptom:checkout-high-latency',
        update: ({ counts }) => counts,
        reinforced: true,
      });

      expect(detail?.status).toBe('established');
    });

    it('retries against the latest counts after a conflict', async () => {
      const esClient = createEsClient();
      esClient.get
        .mockResolvedValueOnce(storedHead({ seqNo: 7 }))
        .mockResolvedValueOnce(storedHead({ seqNo: 8, counts: visited }));
      esClient.index.mockRejectedValueOnce(conflict());
      const update = jest.fn(({ counts }) => counts);

      await createStore(esClient).updateCounts({
        treeId: 'symptom:checkout-high-latency',
        update,
      });

      expect(update.mock.calls[1][0].counts).toEqual(visited);
      expect(esClient.index.mock.calls[1][0]).toMatchObject({ if_seq_no: 8 });
    });

    it('returns undefined without writing when the tree does not exist', async () => {
      const esClient = createEsClient();

      const detail = await createStore(esClient).updateCounts({
        treeId: 'symptom:missing-tree',
        update: ({ counts }) => counts,
      });

      expect(detail).toBeUndefined();
      expect(esClient.index).not.toHaveBeenCalled();
    });
  });

  it('archives with a conditional head write that keeps the counts', async () => {
    const esClient = createEsClient();
    esClient.get.mockResolvedValue(storedHead({ counts: visited, seqNo: 4 }));

    await createStore(esClient).archive('symptom:checkout-high-latency');

    expect(esClient.index.mock.calls[0][0]).toMatchObject({
      if_seq_no: 4,
      document: expect.objectContaining({ counts: visited }),
    });
  });
});
