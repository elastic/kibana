/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import type { DecisionTreeTurnKind } from '@kbn/nightshift-decision-trees';
import type { AuditedSandboxSession } from '../sandbox_audit';
import {
  DECISION_TREE_AI_INDEX_DEST,
  DECISION_TREE_AI_INDEX_ID,
} from '../../common/decision_trees';
import {
  embedAccessedTreesMarker,
  embedRunMarker,
  extractAccessedTreeIds,
  parseAccessedTreesMarker,
  type InvestigationToolCall,
} from './accessed_trees';
import { NO_CAUSAL_VERDICT, type CausalCheckResult } from './causal_check';
import { createLearningStore } from './learning_store';
import { materializeDecisionTrees } from './materialize';
import { createDecisionTreeStore } from './store';
import { buildReinforcementPrompt } from './turn';
import { createDecisionTreeTelemetry } from '../telemetry';

/**
 * Registers the dedicated decision-tree AI index with the Context Engine so it is a managed,
 * discoverable index. The backing Elasticsearch index is auto-created from the `ai-index-idx`
 * template on first write, the same path Wiki uses.
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
  analytics,
  conversationId,
  roundId,
}: {
  session: AuditedSandboxSession;
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  prompt?: string;
  signal?: AbortSignal;
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  roundId?: string;
}): Promise<number | { treeCount: number; hydratedIds: string[] }> => {
  const store = createDecisionTreeStore({ esClient, logger, spaceId, signal });
  const accessedTreeIds = parseAccessedTreesMarker(prompt);
  const trees = await materializeDecisionTrees({
    session,
    store,
    logger,
    signal,
    ...(accessedTreeIds ? { treeIds: accessedTreeIds } : {}),
  });

  // A marker means this is the reinforcement hydrate, which only writes the trees the investigator
  // opened; its absence is the investigator hydrate, which writes every tree so the agent can
  // discover a match through monitors.md.
  createDecisionTreeTelemetry({ analytics, conversationId, roundId, logger }).reportLoaded({
    selection: accessedTreeIds ? 'accessed' : 'discover',
    treeIds: trees.map((tree) => tree.tree_id),
  });

  return {
    treeCount: trees.length,
    hydratedIds: trees.map((tree) => tree.tree_id),
  };
};

/**
 * Builds the closing message for a completed investigation round: the trees the agent may edit,
 * the learnings already on file, and the turn script for this phase. The round itself is handed
 * to the agent separately, as conversation history.
 *
 * A first round edits the trees it opened, or seeds a new one. A follow-up only edits the
 * investigation's own trees: the ones opened in any of its rounds and the ones its earlier
 * reinforcement wrote. With none, it is skipped, so a follow-up never seeds a tree.
 */
export const prepareReinforcementTurn = async ({
  turnKind,
  investigationId,
  roundId,
  earlierAccessedTreeIds = [],
  connectorNames,
  esClient,
  logger,
  spaceId,
  signal,
  toolCalls = [],
  checkCausal,
}: {
  turnKind: DecisionTreeTurnKind;
  investigationId: string;
  /** The investigator's round, carried to the hydrate hook for telemetry. */
  roundId?: string;
  /** Trees the investigator opened in the investigation's earlier rounds. */
  earlierAccessedTreeIds?: string[];
  connectorNames: string[];
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
  toolCalls?: InvestigationToolCall[];
  /**
   * The follow-up's causal check. Called only when a follow-up has trees to edit, so a round that
   * reinforces nothing costs no model call. Without it, a follow-up extends and claims no cause.
   */
  checkCausal?: () => Promise<CausalCheckResult>;
}): Promise<
  | {
      skipped: false;
      message: string;
      treeCount: number;
      turnKind: DecisionTreeTurnKind;
      openedTreeIds: string[];
      /** Set for a follow-up: what its causal check found. */
      verdict?: CausalCheckResult;
    }
  | { skipped: true }
> => {
  const treeStore = createDecisionTreeStore({ esClient, logger, spaceId, signal });
  const isFollowUp = turnKind === 'feedback_reinforcement';
  const [trees, learnings, writtenTreeIds] = await Promise.all([
    treeStore.list(),
    createLearningStore({ esClient, logger, spaceId, signal }).list(),
    isFollowUp ? treeStore.listTreeIdsForInvestigation(investigationId) : [],
  ]);

  const openedIds = new Set(extractAccessedTreeIds(toolCalls));
  const investigationTreeIds = new Set([
    ...openedIds,
    ...(isFollowUp ? [...earlierAccessedTreeIds, ...writtenTreeIds] : []),
  ]);
  const editable = trees.filter(
    (tree) => tree.status !== 'archived' && investigationTreeIds.has(tree.tree_id)
  );
  if (isFollowUp && editable.length === 0) {
    logger.info(
      `Skipped decision tree reinforcement for a follow-up round of "${investigationId}": it has no decision tree to build on`
    );
    return { skipped: true };
  }

  const verdict = isFollowUp ? (checkCausal ? await checkCausal() : NO_CAUSAL_VERDICT) : undefined;
  const message = buildReinforcementPrompt({
    trees: editable,
    learnings,
    connectorNames,
    turnKind,
    causalConfirmed: verdict?.causalConfirmed ?? false,
  });
  return {
    skipped: false,
    message: [
      embedAccessedTreesMarker(editable.map((tree) => tree.tree_id)),
      embedRunMarker({ conversationId: investigationId, roundId }),
      message,
    ].join('\n'),
    treeCount: editable.length,
    turnKind,
    openedTreeIds: editable
      .filter((tree) => openedIds.has(tree.tree_id))
      .map((tree) => tree.tree_id),
    ...(verdict ? { verdict } : {}),
  };
};
