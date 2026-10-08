/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationState } from '@kbn/significant-events-schema';
import {
  buildDecisionGraph,
  DECISION_TREE_NODE_IDS,
  getHypothesisNodeId,
  getPathToNode,
  getWinningHypothesisIndex,
} from './build_decision_graph';
import {
  DECISION_TREE_NODE_WIDTH,
  DECISION_TREE_ROW_GAP,
  DECISION_TREE_SIBLING_GAP,
  layoutDecisionGraph,
} from './layout_decision_graph';

const trigger = { type: 'alert' as const, name: 'Checkout latency' };

const completedState: InvestigationState = {
  summary: 'Checkout failed',
  hypotheses: [
    { candidate: 'DNS failure', confidence: 0.1, status: 'dismissed' },
    { candidate: 'Pool exhaustion', confidence: 0.9, status: 'confirmed' },
    { candidate: 'Bad deploy', confidence: 0.6, status: 'confirmed' },
  ],
  conclusion: 'The pool was too small.',
  impact: { summary: 'Orders failed for 40 minutes.' },
  recommendations: [{ title: 'Raise the pool size', confidence: 0.8 }],
};

const kinds = (graph: ReturnType<typeof buildDecisionGraph>) =>
  graph.nodes.map(({ data }) => data.kind);

describe('buildDecisionGraph', () => {
  it('builds the full tree for a completed run with the hypotheses expanded', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: completedState,
      isRunning: false,
      isHypothesesExpanded: true,
    });

    expect(kinds(graph)).toEqual([
      'trigger',
      'hypotheses',
      'hypothesis',
      'hypothesis',
      'hypothesis',
      'conclusion',
      'actions',
    ]);
    // trigger→chip, chip→3 hyps, 3 hyps→conclusion, conclusion→actions
    expect(graph.edges).toHaveLength(8);
  });

  it('follows the highest-confidence confirmed hypothesis as the happy path', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: completedState,
      isRunning: false,
      isHypothesesExpanded: true,
    });

    expect(graph.edges.filter(({ isHappyPath }) => isHappyPath).map(({ id }) => id)).toEqual([
      `${DECISION_TREE_NODE_IDS.trigger}->${DECISION_TREE_NODE_IDS.hypotheses}`,
      `${DECISION_TREE_NODE_IDS.hypotheses}->${getHypothesisNodeId(1)}`,
      `${getHypothesisNodeId(1)}->${DECISION_TREE_NODE_IDS.conclusion}`,
      `${DECISION_TREE_NODE_IDS.conclusion}->${DECISION_TREE_NODE_IDS.actions}`,
    ]);
  });

  it('connects the chip straight to the conclusion when the hypotheses are collapsed', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: completedState,
      isRunning: false,
      isHypothesesExpanded: false,
    });

    expect(kinds(graph)).toEqual(['trigger', 'hypotheses', 'conclusion', 'actions']);
    expect(graph.edges.map(({ id }) => id)).toContain(
      `${DECISION_TREE_NODE_IDS.hypotheses}->${DECISION_TREE_NODE_IDS.conclusion}`
    );
  });

  it('puts the conclusion text on the conclusion node', () => {
    const conclusion = buildDecisionGraph({
      trigger,
      state: completedState,
      isRunning: false,
      isHypothesesExpanded: false,
    }).nodes.find(({ id }) => id === DECISION_TREE_NODE_IDS.conclusion)?.data;

    expect(conclusion).toEqual({ kind: 'conclusion', conclusion: 'The pool was too small.' });
  });

  it('holds back the conclusion and actions while the run is in progress', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: completedState,
      isRunning: true,
      isHypothesesExpanded: true,
    });

    expect(kinds(graph)).not.toContain('conclusion');
    expect(kinds(graph)).not.toContain('actions');
    expect(graph.edges.some(({ isHappyPath }) => isHappyPath)).toBe(false);
  });

  it('feeds the actions from the hypotheses when there is no conclusion', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: { ...completedState, conclusion: undefined, impact: undefined },
      isRunning: false,
      isHypothesesExpanded: false,
    });

    expect(kinds(graph)).toEqual(['trigger', 'hypotheses', 'actions']);
    expect(graph.edges.map(({ id }) => id)).toContain(
      `${DECISION_TREE_NODE_IDS.hypotheses}->${DECISION_TREE_NODE_IDS.actions}`
    );
  });

  it('orders the proposed actions by confidence and carries the stack expansion', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: {
        ...completedState,
        recommendations: [
          { title: 'Low', confidence: 0.3 },
          { title: 'High', confidence: 0.9 },
          { title: 'Mid', confidence: 0.6 },
        ],
      },
      isRunning: false,
      isHypothesesExpanded: false,
      isActionsExpanded: true,
    });

    const actions = graph.nodes.find(({ id }) => id === DECISION_TREE_NODE_IDS.actions);
    expect(actions?.data).toMatchObject({
      kind: 'actions',
      isExpanded: true,
      recommendations: [{ title: 'High' }, { title: 'Mid' }, { title: 'Low' }],
    });
  });
});

describe('getWinningHypothesisIndex', () => {
  it('returns -1 when nothing is confirmed', () => {
    expect(
      getWinningHypothesisIndex([{ candidate: 'A', confidence: 0.9, status: 'investigating' }])
    ).toBe(-1);
  });
});

describe('getPathToNode', () => {
  it('walks back to the trigger along the happy path', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: completedState,
      isRunning: false,
      isHypothesesExpanded: true,
    });

    const { nodeIds } = getPathToNode(graph.edges, DECISION_TREE_NODE_IDS.actions);

    expect([...nodeIds].sort()).toEqual(
      [
        DECISION_TREE_NODE_IDS.actions,
        DECISION_TREE_NODE_IDS.conclusion,
        getHypothesisNodeId(1),
        DECISION_TREE_NODE_IDS.hypotheses,
        DECISION_TREE_NODE_IDS.trigger,
      ].sort()
    );
  });
});

describe('layoutDecisionGraph', () => {
  it('centres every row on the spine and spaces rows evenly', () => {
    const graph = buildDecisionGraph({
      trigger,
      state: completedState,
      isRunning: false,
      isHypothesesExpanded: true,
    });
    const positioned = layoutDecisionGraph(graph, { trigger: 100, hypotheses: 40 });
    const byId = new Map(positioned.map((node) => [node.id, node]));
    const centre = (id: string) => {
      const node = byId.get(id);
      return node ? node.position.x + node.width / 2 : NaN;
    };

    expect(centre(DECISION_TREE_NODE_IDS.trigger)).toBe(0);
    expect(centre(DECISION_TREE_NODE_IDS.conclusion)).toBe(0);
    expect(centre(getHypothesisNodeId(1))).toBe(0);
    expect(byId.get(DECISION_TREE_NODE_IDS.hypotheses)?.position.y).toBe(
      100 + DECISION_TREE_ROW_GAP
    );
    expect(
      (byId.get(getHypothesisNodeId(1))?.position.x ?? 0) -
        (byId.get(getHypothesisNodeId(0))?.position.x ?? 0)
    ).toBe(DECISION_TREE_NODE_WIDTH.hypothesis + DECISION_TREE_SIBLING_GAP);
  });

  it('keeps the conclusion at its normal width', () => {
    const conclusionWidth = layoutDecisionGraph(
      buildDecisionGraph({
        trigger,
        state: completedState,
        isRunning: false,
        isHypothesesExpanded: false,
      })
    ).find(({ id }) => id === DECISION_TREE_NODE_IDS.conclusion)?.width;

    expect(conclusionWidth).toBe(DECISION_TREE_NODE_WIDTH.conclusion);
  });
});
