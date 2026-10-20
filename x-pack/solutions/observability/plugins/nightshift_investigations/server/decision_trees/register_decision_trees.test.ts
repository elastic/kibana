/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { DecisionTreeSummary } from '../../common/decision_trees';
import { embedAccessedTreesMarker } from './accessed_trees';
import { materializeDecisionTrees, renderMonitorsIndex } from './materialize';
import { hydrateDecisionTreeWorkspace } from './register_decision_trees';

jest.mock('./materialize', () => ({
  ...jest.requireActual('./materialize'),
  materializeDecisionTrees: jest.fn(),
}));

const materializeMock = jest.mocked(materializeDecisionTrees);

const TREE: DecisionTreeSummary = {
  tree_id: 'symptom:checkout-high-latency',
  symptom: 'Checkout latency is high',
  title: 'Checkout latency',
  status: 'established',
  version: 1,
  node_count: 3,
  edge_count: 2,
  learning_count: 0,
  updated_at: '2026-01-01T00:00:00Z',
};

const hydrate = (prompt?: string) =>
  hydrateDecisionTreeWorkspace({
    session: {} as never,
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggerMock.create(),
    spaceId: 'default',
    prompt,
  });

describe('hydrateDecisionTreeWorkspace', () => {
  beforeEach(() => {
    materializeMock.mockReset().mockResolvedValue([TREE]);
  });

  it('returns the monitors index for the investigator hydrate', async () => {
    await expect(hydrate('Why is checkout slow?')).resolves.toEqual({
      treeCount: 1,
      index: renderMonitorsIndex([TREE]),
    });
    expect(materializeMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ treeIds: expect.anything() })
    );
  });

  it('returns no index for the reinforcement hydrate', async () => {
    const prompt = `${embedAccessedTreesMarker([TREE.tree_id])}\nReinforce.`;

    await expect(hydrate(prompt)).resolves.toEqual({ treeCount: 1 });
    expect(materializeMock).toHaveBeenCalledWith(
      expect.objectContaining({ treeIds: [TREE.tree_id] })
    );
  });

  it('returns no index for a reinforcement hydrate whose marker names no trees', async () => {
    materializeMock.mockResolvedValue([]);

    await expect(hydrate(`${embedAccessedTreesMarker([])}\nReinforce.`)).resolves.toEqual({
      treeCount: 0,
    });
    expect(materializeMock).toHaveBeenCalledWith(expect.objectContaining({ treeIds: [] }));
  });
});
