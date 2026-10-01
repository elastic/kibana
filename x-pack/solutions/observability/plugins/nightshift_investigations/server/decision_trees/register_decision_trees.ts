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
import { createLearningStore } from './learning_store';
import { materializeDecisionTrees } from './materialize';
import { createDecisionTreeStore } from './store';
import { buildReinforcementPrompt } from './turn';

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
 * Builds the reinforcement agent's message for a completed investigation round: the transcript,
 * the trees it may edit, the learnings already on file, and the turn script for this phase.
 */
export const prepareReinforcementTurn = async ({
  prompt,
  response,
  connectorNames,
  esClient,
  logger,
  spaceId,
  signal,
  toolCalls = [],
}: {
  prompt: string;
  response: string;
  connectorNames: string[];
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
  toolCalls?: InvestigationToolCall[];
}): Promise<{ message: string; treeCount: number }> => {
  const [trees, learnings] = await Promise.all([
    createDecisionTreeStore({ esClient, logger, spaceId, signal }).list(),
    createLearningStore({ esClient, logger, spaceId, signal }).list(),
  ]);

  const accessedIds = new Set(extractAccessedTreeIds(toolCalls));
  const accessed = trees.filter(
    (tree) => tree.status !== 'archived' && accessedIds.has(tree.tree_id)
  );
  return {
    message: [
      embedAccessedTreesMarker(accessed.map((tree) => tree.tree_id)),
      buildReinforcementPrompt({
        trees: accessed,
        learnings,
        connectorNames,
        prompt,
        response,
      }),
    ].join('\n'),
    treeCount: accessed.length,
  };
};
