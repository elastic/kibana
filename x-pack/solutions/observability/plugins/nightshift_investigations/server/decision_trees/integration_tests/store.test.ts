/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import {
  carryCounts,
  countsForTree,
  parseMermaidDecisionTree,
  recordVisit,
  reinforcePath,
  type DecisionTreeCounts,
} from '@kbn/nightshift-decision-trees';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { DECISION_TREE_AI_INDEX_DEST } from '../../../common/decision_trees';
import { createDecisionTreeStore, type StoredTreeCounts } from '../store';

const TREE_ID = 'symptom:checkout-high-latency';

const MERMAID = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|✅ yes| X1((Connection leak))
    D1 -->|no| X2((Slow query))`;

const MARKDOWN = `# Checkout high latency\n\n\`\`\`mermaid\n${MERMAID}\n\`\`\`\n`;

const TREE = parseMermaidDecisionTree(MERMAID, TREE_ID);

const PATH = [
  { source_node_id: 'S1', target_node_id: 'E1' },
  { source_node_id: 'E1', target_node_id: 'D1' },
  { source_node_id: 'D1', target_node_id: 'X1', condition: 'yes' },
];

const NOW = '2026-10-21T10:00:00.000Z';

/** Carries whatever is stored onto TREE, then records one visit along PATH. */
const visitOnce = (previous: StoredTreeCounts | undefined): DecisionTreeCounts =>
  recordVisit({
    tree: TREE,
    counts: previous
      ? carryCounts({
          previousTree: previous.tree,
          previousCounts: previous.counts,
          nextTree: TREE,
        })
      : countsForTree(TREE),
    path: PATH,
    now: NOW,
  });

const nodeCount = (counts: DecisionTreeCounts | undefined, nodeId: string) =>
  counts?.nodes.find((node) => node.node_id === nodeId);

describe('Nightshift decision-tree store with Elasticsearch', () => {
  jest.setTimeout(180_000);

  let esServer: EsTestCluster;
  let esClient: Client;

  const createStore = () =>
    createDecisionTreeStore({
      esClient: esClient as never,
      logger: loggerMock.create(),
      spaceId: 'default',
    });

  const commit = (summary: string) =>
    createStore().commit({
      treeId: TREE_ID,
      markdown: MARKDOWN,
      tree: TREE,
      reinforced: false,
      author: 'nightshift-test',
      summary,
      learnings: [],
      evidenceGathererMetadata: [],
      updateCounts: visitOnce,
    });

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
      // The managed AI-index mapping writes semantic_text, which needs a trial license.
      license: 'trial',
    });
    await esServer.start();
    esClient = esServer.getClient();
  });

  beforeEach(async () => {
    await esClient.indices.delete({ index: DECISION_TREE_AI_INDEX_DEST, ignore_unavailable: true });
  });

  afterAll(async () => {
    await esClient?.indices.delete({
      index: DECISION_TREE_AI_INDEX_DEST,
      ignore_unavailable: true,
    });
    await esClient?.close();
    await esServer?.stop();
  });

  it('round-trips counts, including fractional reinforcement, through the managed mapping', async () => {
    await commit('Initial tree.');
    await createStore().updateCounts({
      treeId: TREE_ID,
      update: ({ tree, counts }) =>
        reinforcePath({ tree, counts, path: PATH, weight: 0.5, now: NOW }),
    });

    const head = await createStore().get(TREE_ID);
    const version = await createStore().getVersion(TREE_ID, 1);

    expect(nodeCount(head?.counts, 'X1')).toMatchObject({
      visit_count: 1,
      reinforced_count: 0.5,
      last_visited_at: NOW,
      last_reinforced_at: NOW,
    });
    // The head-only update leaves the version snapshot as it was committed.
    expect(nodeCount(version?.counts, 'X1')).toMatchObject({ visit_count: 1, reinforced_count: 0 });
    expect(head?.version).toBe(1);
  });

  it('loses no visit when count updates race', async () => {
    await commit('Initial tree.');

    await Promise.all(
      Array.from({ length: 3 }, () =>
        createStore().updateCounts({
          treeId: TREE_ID,
          update: ({ tree, counts }) => recordVisit({ tree, counts, path: PATH, now: NOW }),
        })
      )
    );

    const head = await createStore().get(TREE_ID);
    expect(nodeCount(head?.counts, 'S1')?.visit_count).toBe(4);
  });

  it('gives racing commits distinct versions and keeps every visit', async () => {
    await commit('Initial tree.');

    await Promise.all([commit('Turn A.'), commit('Turn B.')]);

    const head = await createStore().get(TREE_ID);
    const versions = await createStore().listVersions(TREE_ID);
    expect(head?.version).toBe(3);
    expect(versions.map(({ version }) => version).sort()).toEqual([1, 2, 3]);
    expect(new Set(versions.map(({ summary }) => summary))).toEqual(
      new Set(['Initial tree.', 'Turn A.', 'Turn B.'])
    );
    expect(nodeCount(head?.counts, 'S1')?.visit_count).toBe(3);
  });
});
