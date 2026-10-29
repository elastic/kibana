/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { buildTurnScripts } from '@kbn/nightshift-decision-trees';
import { DECISION_TREE_PROMPT_TOOLS } from '../tools/decision_tree/prompt_tools';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { createLearningStore } from './learning_store';
import { prepareReinforcementTurn } from './register_decision_trees';
import { createDecisionTreeStore, type DecisionTreeSummary } from './store';

jest.mock('./store', () => ({ createDecisionTreeStore: jest.fn() }));
jest.mock('./learning_store', () => ({ createLearningStore: jest.fn() }));

const scripts = buildTurnScripts(DECISION_TREE_PROMPT_TOOLS);

const tree = (slug: string, overrides: Partial<DecisionTreeSummary> = {}): DecisionTreeSummary => ({
  tree_id: `symptom:${slug}`,
  symptom: slug,
  title: slug,
  status: 'tentative',
  version: 1,
  node_count: 5,
  edge_count: 4,
  learning_count: 0,
  updated_at: '2026-09-09T12:00:00.000Z',
  ...overrides,
});

const readTree = (slug: string) => ({
  tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
  tool_call_id: `read-${slug}`,
  params: { file_path: `/workspace/decision-trees/decision_tree_${slug}.md` },
  results: [{ type: 'other', data: { content: 'tree' } }],
});

describe('prepareReinforcementTurn', () => {
  const logger = loggerMock.create();
  const treeStore = { list: jest.fn() };

  const prepare = (overrides: Partial<Parameters<typeof prepareReinforcementTurn>[0]> = {}) =>
    prepareReinforcementTurn({
      roundKind: 'follow_up',
      investigationId: 'inv-1',
      connectorNames: [],
      esClient: {} as never,
      logger,
      spaceId: 'default',
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createDecisionTreeStore).mockReturnValue(treeStore as never);
    jest.mocked(createLearningStore).mockReturnValue({
      list: jest.fn().mockResolvedValue([]),
    } as never);
    treeStore.list.mockResolvedValue([
      tree('checkout-latency'),
      tree('payment-errors'),
      tree('disk-pressure'),
      tree('archived-tree', { status: 'archived' }),
    ]);
  });

  describe('a first round', () => {
    it('edits the trees it opened', async () => {
      const turn = await prepare({
        roundKind: 'initial',
        toolCalls: [readTree('checkout-latency')],
      });

      expect(turn).toMatchObject({
        skipped: false,
        treeCount: 1,
        turnKind: 'initial_investigation',
      });
      expect(turn.skipped === false && turn.message).toContain(scripts.initialMerge);
    });

    it('seeds a new tree when it opened none', async () => {
      const turn = await prepare({ roundKind: 'initial' });

      expect(turn).toMatchObject({ skipped: false, treeCount: 0 });
      expect(turn.skipped === false && turn.message).toContain(scripts.initialCreate);
    });

    // A first round has no earlier rounds; only its own reads say which trees it used.
    it('ignores trees from other rounds', async () => {
      const turn = await prepare({
        roundKind: 'initial',
        earlierAccessedTreeIds: ['symptom:disk-pressure'],
      });

      expect(turn).toMatchObject({ skipped: false, treeCount: 0 });
    });
  });

  describe.each(['follow_up', 'alert_recovery'] as const)('a %s round', (roundKind) => {
    it("edits only the investigation's own trees", async () => {
      const turn = await prepare({
        roundKind,
        earlierAccessedTreeIds: ['symptom:checkout-latency', 'symptom:archived-tree'],
      });

      expect(turn).toMatchObject({
        skipped: false,
        treeCount: 1,
        turnKind: 'feedback_reinforcement',
      });
      const message = turn.skipped === false ? turn.message : '';
      expect(message).toContain(scripts.followupExtend);
      expect(message).toContain('symptom:checkout-latency');
      expect(message).not.toContain('symptom:payment-errors');
      expect(message).not.toContain('symptom:disk-pressure');
      expect(message).not.toContain('symptom:archived-tree —');
    });

    it('also edits a tree it opened this round', async () => {
      const turn = await prepare({ roundKind, toolCalls: [readTree('disk-pressure')] });

      expect(turn).toMatchObject({ skipped: false, treeCount: 1 });
    });

    // A recovery or a reply has nothing new to seed a tree from.
    it('is skipped when the investigation has no tree to build on', async () => {
      await expect(prepare({ roundKind })).resolves.toEqual({ skipped: true });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('it has no decision tree to build on')
      );
    });
  });
});
