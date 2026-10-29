/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { DecisionTreeTurnKind } from '@kbn/nightshift-decision-trees';
import {
  DECISION_TREE_AI_INDEX_DEST,
  DECISION_TREE_AI_INDEX_ID,
} from '../../common/decision_trees';
import {
  embedAccessedTreesMarker,
  extractAccessedTreeIds,
  parseAccessedTreesMarker,
  type InvestigationToolCall,
} from './accessed_trees';
import type { InvestigationRoundKind } from '../client/round_kind';
import { NO_VERDICT, type RoundVerdict } from '../round_verdict/classify';
import { createLearningStore } from './learning_store';
import { materializeDecisionTrees } from './materialize';
import { createDecisionTreeStore } from './store';
import { buildReinforcementPrompt, turnKindForRound } from './turn';

/**
 * Registers the dedicated decision-tree AI index with the Context Engine so it is a managed,
 * discoverable index. The backing Elasticsearch index is auto-created from the `ai-index-idx`
 * template on first write, the same path Cortex uses.
 */
export const registerDecisionTreeAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): void => {
  if (!contextEngine) {
    logger.debug('contextEngine is not available — decision-tree AI index will not be registered');
    return;
  }

  contextEngine.registerAiIndex(DECISION_TREE_AI_INDEX_ID, {
    description: i18n.translate('xpack.nightshiftInvestigations.decisionTrees.aiIndexDescription', {
      defaultMessage:
        'Nightshift decision trees — versioned Mermaid investigation trees and the learnings the reinforcement agent captures for each symptom.',
    }),
    dest: { type: 'index', value: DECISION_TREE_AI_INDEX_DEST },
    automations: [],
    sources: [],
    traces: [],
  });
};

/** Writes the stored decision trees into the reinforcement agent's sandbox for this round. */
export const hydrateDecisionTreeWorkspace = async ({
  session,
  esClient,
  logger,
  spaceId,
  prompt,
  signal,
}: {
  session: SandboxSession;
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  prompt?: string;
  signal?: AbortSignal;
}): Promise<number> => {
  const store = createDecisionTreeStore({ esClient, logger, spaceId, signal });
  const accessedTreeIds = parseAccessedTreesMarker(prompt);
  const trees = await materializeDecisionTrees({
    session,
    store,
    logger,
    signal,
    ...(accessedTreeIds ? { treeIds: accessedTreeIds } : {}),
  });
  return trees.length;
};

/**
 * Builds the closing message for a completed investigation round: the trees the agent may edit,
 * the learnings already on file, and the turn script for this phase. The round itself is handed
 * to the agent separately, as conversation history.
 *
 * A first round edits the trees it opened, or seeds a new one. A later round only edits the
 * investigation's own trees: the ones opened in any of its rounds. With none, it is skipped,
 * so a follow-up never seeds a tree from a recovery or a reply.
 */
export const prepareReinforcementTurn = async ({
  roundKind,
  investigationId,
  earlierAccessedTreeIds = [],
  connectorNames,
  esClient,
  logger,
  spaceId,
  signal,
  toolCalls = [],
  verdict = NO_VERDICT,
}: {
  roundKind: InvestigationRoundKind;
  investigationId: string;
  /** Trees the investigator opened in the investigation's earlier rounds. */
  earlierAccessedTreeIds?: string[];
  connectorNames: string[];
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
  toolCalls?: InvestigationToolCall[];
  /** What the round said about the earlier root cause, from nightshift.classifyFollowUp. */
  verdict?: Pick<RoundVerdict, 'isFeedback' | 'causalConfirmed' | 'causalSummary' | 'learning'>;
}): Promise<
  | {
      skipped: false;
      message: string;
      treeCount: number;
      turnKind: DecisionTreeTurnKind;
      /** Learnings come from feedback: a follow-up that said nothing has none to record. */
      offerLearningTools: boolean;
    }
  | { skipped: true }
> => {
  const treeStore = createDecisionTreeStore({ esClient, logger, spaceId, signal });
  const turnKind = turnKindForRound(roundKind);
  const isFollowUp = turnKind === 'feedback_reinforcement';
  const [trees, learnings] = await Promise.all([
    treeStore.list(),
    createLearningStore({ esClient, logger, spaceId, signal }).list(),
  ]);

  const investigationTreeIds = new Set([
    ...extractAccessedTreeIds(toolCalls),
    ...(isFollowUp ? earlierAccessedTreeIds : []),
  ]);
  const editable = trees.filter(
    (tree) => tree.status !== 'archived' && investigationTreeIds.has(tree.tree_id)
  );
  if (isFollowUp && editable.length === 0) {
    logger.info(
      `Skipped decision tree reinforcement for a ${roundKind} round of investigation "${investigationId}": it has no decision tree to build on`
    );
    return { skipped: true };
  }

  const message = buildReinforcementPrompt({
    trees: editable,
    learnings,
    connectorNames,
    turnKind,
    verdict,
  });
  return {
    skipped: false,
    message: [embedAccessedTreesMarker(editable.map((tree) => tree.tree_id)), message].join('\n'),
    treeCount: editable.length,
    turnKind,
    offerLearningTools: isFollowUp && verdict.isFeedback,
  };
};
