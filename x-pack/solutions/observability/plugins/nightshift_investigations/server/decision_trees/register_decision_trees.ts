/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
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
