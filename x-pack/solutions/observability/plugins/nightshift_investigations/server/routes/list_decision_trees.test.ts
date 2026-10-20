/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import type { DecisionTreeSummary } from '../../common/decision_trees';
import { listDecisionTreesRoute } from './list_decision_trees';

const { handler } = listDecisionTreesRoute['GET /internal/nightshift/decision_trees'];

const summary = (overrides: Partial<DecisionTreeSummary> = {}): DecisionTreeSummary => ({
  tree_id: 'symptom:checkout-high-latency',
  symptom: 'checkout-high-latency',
  title: 'Checkout High Latency',
  status: 'tentative',
  version: 1,
  node_count: 5,
  edge_count: 4,
  learning_count: 0,
  updated_at: '2026-09-09T12:00:00.000Z',
  ...overrides,
});

const run = ({
  trees,
  status,
  enabled = true,
}: {
  trees: DecisionTreeSummary[];
  status?: DecisionTreeSummary['status'];
  enabled?: boolean;
}) =>
  handler({
    request: {},
    params: { query: status ? { status } : {} },
    isDecisionTreesEnabled: () => enabled,
    getDecisionTreeStore: () => ({ list: jest.fn().mockResolvedValue(trees) }),
  } as never);

it('throws when decision trees are disabled', async () => {
  await expect(run({ trees: [], enabled: false })).rejects.toEqual(
    notFound('Decision trees are not enabled')
  );
});

it('returns every tree with stats computed over the full set', async () => {
  const result = await run({
    trees: [
      summary({ status: 'established', version: 3 }),
      summary({ symptom: 'redis-evictions', tree_id: 'symptom:redis-evictions', version: 2 }),
    ],
  });

  expect(result.trees).toHaveLength(2);
  expect(result.stats).toEqual({
    total: 2,
    established: 1,
    total_versions: 5,
    last_updated: '2026-09-09T12:00:00.000Z',
  });
});

it('filters the returned trees by status but keeps stats over the full set', async () => {
  const result = await run({
    trees: [
      summary({ status: 'established' }),
      summary({ symptom: 'redis-evictions', tree_id: 'symptom:redis-evictions' }),
    ],
    status: 'established',
  });

  expect(result.trees).toHaveLength(1);
  expect(result.trees[0].status).toBe('established');
  expect(result.stats.total).toBe(2);
});
