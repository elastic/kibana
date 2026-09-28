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
import { buildReinforcementPrompt, deriveCausalConfirmed, deriveTurnKind } from './turn';

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

describe('deriveCausalConfirmed', () => {
  it('detects a confirmed hypothesis in the structured output', () => {
    expect(
      deriveCausalConfirmed('{"hypotheses":[{"candidate":"leak","status":"confirmed"}]}')
    ).toBe(true);
  });

  it('detects the unquoted form', () => {
    expect(deriveCausalConfirmed('- candidate: leak\n  status: confirmed')).toBe(true);
  });

  it('is false when every hypothesis is still open or dismissed', () => {
    expect(
      deriveCausalConfirmed('{"hypotheses":[{"status":"investigating"},{"status":"dismissed"}]}')
    ).toBe(false);
  });
});

describe('deriveTurnKind', () => {
  it('treats a tree still on its first version as an initial investigation', () => {
    expect(deriveTurnKind([tree({ version: 1 })])).toBe('initial_investigation');
  });

  it('treats a revised tree as a follow-up', () => {
    expect(deriveTurnKind([tree({ version: 2 })])).toBe('feedback_reinforcement');
  });

  it('treats no trees at all as an initial investigation', () => {
    expect(deriveTurnKind([])).toBe('initial_investigation');
  });
});

describe('buildReinforcementPrompt', () => {
  const base = {
    learnings: [] as LearningRecord[],
    connectorNames: ['elastic-telemetry'],
    prompt: 'Why is checkout slow?',
    response: 'Connection pool exhausted.',
  };

  it('asks for a new tree when the investigator did not open one', () => {
    const message = buildReinforcementPrompt({ ...base, trees: [] });

    expect(message).toContain(scripts.initialCreate);
    expect(message).toContain('Decision-tree files available for edit:\n- None');
  });

  it('asks for a merge when the investigator opened a first-version tree', () => {
    const message = buildReinforcementPrompt({ ...base, trees: [tree()] });

    expect(message).toContain(scripts.initialMerge);
    expect(message).toContain(
      'symptom:checkout-high-latency — /workspace/decision-trees/decision_tree_checkout-high-latency.md'
    );
  });

  it('asks for reinforcement once a revised tree has a confirmed root cause', () => {
    const message = buildReinforcementPrompt({
      ...base,
      trees: [tree({ version: 3 })],
      response: '{"hypotheses":[{"status":"confirmed"}]}',
    });

    expect(message).toContain(scripts.reinforce);
  });

  it('asks for an extension on a follow-up with no confirmed root cause', () => {
    const message = buildReinforcementPrompt({ ...base, trees: [tree({ version: 3 })] });

    expect(message).toContain(scripts.followupExtend);
  });

  it('carries the transcript and the active learnings', () => {
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

    expect(message).toContain('Why is checkout slow?');
    expect(message).toContain('Connection pool exhausted.');
    expect(message).toContain('- Checkout depends on Redis.');
    expect(message).toContain('- Checkout shares a connection pool.');
    expect(message).not.toContain('Payments use a different cluster.');
    expect(message).toContain('- elastic-telemetry, query_pattern: Filter by service.name.');
    expect(message).toContain('- symptom:checkout-high-latency: Raise the pool size.');
    expect(message).toContain('- symptom:checkout-high-latency: Restart the checkout workers.');
    expect(message).toContain('elastic-telemetry');
  });
});
