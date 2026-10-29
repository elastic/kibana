/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTurnScripts } from '@kbn/nightshift-decision-trees';
import type { LearningRecord } from '@kbn/nightshift-decision-trees';
import { DECISION_TREE_PROMPT_TOOLS } from '../tools/decision_tree/prompt_tools';
import type { DecisionTreeSummary } from './store';
import { buildReinforcementPrompt, turnKindForRound } from './turn';

const scripts = buildTurnScripts(DECISION_TREE_PROMPT_TOOLS);

const tree = (overrides: Partial<DecisionTreeSummary> = {}): DecisionTreeSummary => ({
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

describe('turnKindForRound', () => {
  it('seeds the trees only on the round that starts the investigation', () => {
    expect(turnKindForRound('initial')).toBe('initial_investigation');
  });

  it('builds on the trees for a reply and for an alert recovery', () => {
    expect(turnKindForRound('follow_up')).toBe('feedback_reinforcement');
    expect(turnKindForRound('alert_recovery')).toBe('feedback_reinforcement');
  });
});

describe('buildReinforcementPrompt', () => {
  const base = {
    learnings: [] as LearningRecord[],
    connectorNames: ['elastic-telemetry'],
    turnKind: 'initial_investigation' as const,
  };

  it('asks for a new tree when the first round opened none', () => {
    const message = buildReinforcementPrompt({ ...base, trees: [] });

    expect(message).toContain(scripts.initialCreate);
    expect(message).toContain('Decision-tree files available for edit:\n- None');
  });

  it('asks for a merge when the first round opened a tree', () => {
    const message = buildReinforcementPrompt({ ...base, trees: [tree({ version: 4 })] });

    expect(message).toContain(scripts.initialMerge);
    expect(message).toContain(
      'symptom:checkout-high-latency — /workspace/decision-trees/decision_tree_checkout-high-latency.md'
    );
  });

  // The tree's version says how often other investigations revised it, not which round this is.
  it('asks a follow-up to extend the tree, even one still on its first version', () => {
    const message = buildReinforcementPrompt({
      ...base,
      turnKind: 'feedback_reinforcement',
      trees: [tree({ version: 1 })],
    });

    expect(message).toContain(scripts.followupExtend);
  });

  it('never asks a follow-up to reinforce a path as causal', () => {
    const message = buildReinforcementPrompt({
      ...base,
      turnKind: 'feedback_reinforcement',
      trees: [tree({ version: 3 })],
    });

    expect(message).not.toContain(scripts.reinforce);
  });

  // The investigation reaches the agent as conversation history, not inside this message.
  it('leaves the transcript out and carries the active learnings', () => {
    const message = buildReinforcementPrompt({
      ...base,
      trees: [tree()],
      learnings: [
        {
          kind: 'system',
          tree_id: 'symptom:checkout-high-latency',
          category: 'dependency',
          content: 'Checkout depends on Redis.',
          keywords: [],
        },
        {
          kind: 'system',
          tree_id: 'symptom:checkout-high-latency',
          category: 'architecture',
          content: 'Checkout shares a connection pool.',
          keywords: [],
        },
        {
          kind: 'system',
          tree_id: 'symptom:payment-errors',
          category: 'architecture',
          content: 'Payments use a different cluster.',
          keywords: [],
        },
        {
          kind: 'tool',
          tree_id: 'symptom:checkout-high-latency',
          category: 'query_pattern',
          connector_name: 'elastic-telemetry',
          content: 'Filter by service.name.',
          keywords: [],
        },
        {
          kind: 'remediation',
          tree_id: 'symptom:checkout-high-latency',
          content: 'Raise the pool size.',
          keywords: [],
        },
        {
          kind: 'remediation',
          tree_id: 'symptom:checkout-high-latency',
          content: 'Restart the checkout workers.',
          keywords: [],
        },
      ],
    });

    expect(message).not.toContain('## Investigation transcript');
    expect(message).toContain('- Checkout depends on Redis.');
    expect(message).toContain('- Checkout shares a connection pool.');
    expect(message).not.toContain('Payments use a different cluster.');
    expect(message).toContain('- elastic-telemetry, query_pattern: Filter by service.name.');
    expect(message).toContain('- symptom:checkout-high-latency: Raise the pool size.');
    expect(message).toContain('- symptom:checkout-high-latency: Restart the checkout workers.');
    expect(message).toContain('elastic-telemetry');
  });
});
