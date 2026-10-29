/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildTurnPrompt,
  selectTurnScript,
  symptomSlugFromTreeId,
} from '@kbn/nightshift-decision-trees';
import type { DecisionTreeTurnKind, LearningRecord } from '@kbn/nightshift-decision-trees';
import type { InvestigationRoundKind } from '../client/round_kind';
import { NO_VERDICT, type RoundVerdict } from '../round_verdict/classify';
import { DECISION_TREE_PROMPT_TOOLS } from '../tools/decision_tree/prompt_tools';
import type { DecisionTreeSummary } from './store';
import { workspacePathForTree } from './materialize';

/** Only the round that starts an investigation seeds trees; every later round builds on them. */
export const turnKindForRound = (roundKind: InvestigationRoundKind): DecisionTreeTurnKind =>
  roundKind === 'initial' ? 'initial_investigation' : 'feedback_reinforcement';

/**
 * Assembles the closing message handed to the reinforcement agent for one round. The
 * investigation itself is not in it: it reaches the agent as conversation history.
 */
export const buildReinforcementPrompt = ({
  trees,
  learnings,
  connectorNames,
  turnKind,
  verdict = NO_VERDICT,
}: {
  trees: DecisionTreeSummary[];
  learnings: LearningRecord[];
  connectorNames: string[];
  turnKind: DecisionTreeTurnKind;
  verdict?: Pick<RoundVerdict, 'isFeedback' | 'causalConfirmed' | 'causalSummary' | 'learning'>;
}): string => {
  const isFollowUp = turnKind === 'feedback_reinforcement';
  const script = selectTurnScript({
    turnKind,
    causalConfirmed: verdict.causalConfirmed,
    // Callers pass only the trees this investigation used, never every tree in the index.
    hasExistingTrees: trees.length > 0,
    tools: DECISION_TREE_PROMPT_TOOLS,
  });

  const relevantLearnings = learnings.filter((learning) => {
    if (learning.tree_id === undefined) {
      return false;
    }
    const learningSlug = symptomSlugFromTreeId(learning.tree_id);
    return trees.some((tree) => learningSlug === tree.symptom);
  });

  return buildTurnPrompt({
    editableTreePaths: trees.map(
      (tree) => `${tree.tree_id} — ${workspacePathForTree(tree.tree_id)}`
    ),
    activeSystemLearnings: relevantLearnings
      .filter((learning) => learning.kind === 'system')
      .map((learning) => learning.content),
    activeToolLearnings: relevantLearnings
      .filter((learning) => learning.kind === 'tool')
      .map((learning) => `${learning.connector_name}, ${learning.category}: ${learning.content}`),
    activeRemediations: relevantLearnings
      .filter((learning) => learning.kind === 'remediation')
      .map((learning) => `${learning.tree_id}: ${learning.content}`),
    connectorNames,
    ...(isFollowUp && verdict.isFeedback && verdict.causalSummary
      ? { verdict: { causalSummary: verdict.causalSummary, learning: verdict.learning } }
      : {}),
    script,
  });
};
