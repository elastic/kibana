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
  const treeStore = { list: jest.fn(), listTreeIdsForInvestigation: jest.fn() };

  const prepare = (overrides: Partial<Parameters<typeof prepareReinforcementTurn>[0]> = {}) =>
    prepareReinforcementTurn({
      turnKind: 'feedback_reinforcement',
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
      tree('seeded-by-round-one'),
      tree('archived-tree', { status: 'archived' }),
    ]);
    treeStore.listTreeIdsForInvestigation.mockResolvedValue([]);
  });

  describe('a first round', () => {
    it('edits the trees it opened', async () => {
      const turn = await prepare({
        turnKind: 'initial_investigation',
        toolCalls: [readTree('checkout-latency')],
      });

      expect(turn).toMatchObject({
        skipped: false,
        treeCount: 1,
        turnKind: 'initial_investigation',
        openedTreeIds: ['symptom:checkout-latency'],
      });
      expect(turn.skipped === false && turn.message).toContain(scripts.initialMerge);
    });

    // The tree's version says how often other investigations revised it, not which round this is.
    it('stays a first round on a tree other investigations revised', async () => {
      treeStore.list.mockResolvedValue([tree('checkout-latency', { version: 4 })]);

      const turn = await prepare({
        turnKind: 'initial_investigation',
        toolCalls: [readTree('checkout-latency')],
      });

      expect(turn.skipped === false && turn.message).toContain(scripts.initialMerge);
    });

    it('seeds a new tree when it opened none', async () => {
      const turn = await prepare({ turnKind: 'initial_investigation' });

      expect(turn).toMatchObject({ skipped: false, treeCount: 0 });
      expect(turn.skipped === false && turn.message).toContain(scripts.initialCreate);
    });

    it('does not look up trees written by earlier rounds', async () => {
      await prepare({ turnKind: 'initial_investigation' });

      expect(treeStore.listTreeIdsForInvestigation).not.toHaveBeenCalled();
    });
  });

  describe('a follow-up', () => {
    it("edits only the investigation's own trees", async () => {
      const turn = await prepare({
        earlierAccessedTreeIds: ['symptom:checkout-latency', 'symptom:archived-tree'],
      });

      expect(turn).toMatchObject({
        skipped: false,
        treeCount: 1,
        turnKind: 'feedback_reinforcement',
        openedTreeIds: [],
      });
      const message = turn.skipped === false ? turn.message : '';
      expect(message).toContain(scripts.followupExtend);
      expect(message).toContain('symptom:checkout-latency');
      expect(message).not.toContain('symptom:payment-errors');
      expect(message).not.toContain('symptom:archived-tree —');
    });

    it('also edits a tree it opened this round', async () => {
      const turn = await prepare({ toolCalls: [readTree('disk-pressure')] });

      expect(turn).toMatchObject({
        skipped: false,
        treeCount: 1,
        openedTreeIds: ['symptom:disk-pressure'],
      });
    });

    // Round one's reinforcement can create a tree the investigator never opened.
    it('edits a tree an earlier round of the investigation wrote', async () => {
      treeStore.listTreeIdsForInvestigation.mockResolvedValue(['symptom:seeded-by-round-one']);

      const turn = await prepare();

      expect(treeStore.listTreeIdsForInvestigation).toHaveBeenCalledWith('inv-1');
      expect(turn).toMatchObject({ skipped: false, treeCount: 1 });
      expect(turn.skipped === false && turn.message).toContain('symptom:seeded-by-round-one');
    });

    it('never asks to reinforce a path as causal', async () => {
      const turn = await prepare({ earlierAccessedTreeIds: ['symptom:checkout-latency'] });

      expect(turn.skipped === false && turn.message).not.toContain(scripts.reinforce);
    });

    // A recovery or a reply has nothing new to seed a tree from.
    it('is skipped when the investigation has no tree to build on', async () => {
      await expect(prepare()).resolves.toEqual({ skipped: true });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('it has no decision tree to build on')
      );
    });
  });
});
