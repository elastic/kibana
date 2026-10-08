/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationHypothesis,
  InvestigationRecommendation,
  InvestigationState,
} from '@kbn/significant-events-schema';
import type { InvestigationSubjectType } from '../../../common';

export interface DecisionTreeTrigger {
  type: InvestigationSubjectType;
  name: string;
}

export interface HypothesisStatusCounts {
  confirmed: number;
  dismissed: number;
  investigating: number;
}

export type DecisionTreeNodeData =
  | { kind: 'trigger'; trigger: DecisionTreeTrigger }
  | {
      kind: 'hypotheses';
      total: number;
      counts: HypothesisStatusCounts;
      isExpanded: boolean;
    }
  | {
      kind: 'hypothesis';
      hypothesis: InvestigationHypothesis;
      index: number;
      isWinner: boolean;
    }
  | {
      kind: 'conclusion';
      conclusion: string;
    }
  | {
      kind: 'actions';
      /** Highest confidence first, so the front of the collapsed stack is the recommended one. */
      recommendations: InvestigationRecommendation[];
      isExpanded: boolean;
    };

export type DecisionTreeNodeKind = DecisionTreeNodeData['kind'];

export interface DecisionGraphNode {
  id: string;
  data: DecisionTreeNodeData;
}

export interface DecisionGraphEdge {
  id: string;
  source: string;
  target: string;
  /** Part of Trigger → winning hypothesis → Conclusion → Actions. */
  isHappyPath: boolean;
}

export interface DecisionGraph {
  nodes: DecisionGraphNode[];
  edges: DecisionGraphEdge[];
}

export const DECISION_TREE_NODE_IDS = {
  trigger: 'trigger',
  hypotheses: 'hypotheses',
  conclusion: 'conclusion',
  actions: 'actions',
} as const;

export const getHypothesisNodeId = (index: number): string => `hypothesis-${index}`;

export const getHypothesisStatusCounts = (
  hypotheses: readonly InvestigationHypothesis[]
): HypothesisStatusCounts =>
  hypotheses.reduce<HypothesisStatusCounts>(
    (counts, { status }) => ({ ...counts, [status]: counts[status] + 1 }),
    { confirmed: 0, dismissed: 0, investigating: 0 }
  );

/** Index of the highest-confidence confirmed hypothesis, or -1 when none is confirmed. */
export const getWinningHypothesisIndex = (hypotheses: readonly InvestigationHypothesis[]): number =>
  hypotheses.reduce(
    (winner, hypothesis, index) =>
      hypothesis.status === 'confirmed' &&
      (winner === -1 || hypothesis.confidence > hypotheses[winner].confidence)
        ? index
        : winner,
    -1
  );

export const sortRecommendations = (
  recommendations: readonly InvestigationRecommendation[]
): InvestigationRecommendation[] =>
  [...recommendations].sort((first, second) => second.confidence - first.confidence);

const createEdge = (source: string, target: string, isHappyPath: boolean): DecisionGraphEdge => ({
  id: `${source}->${target}`,
  source,
  target,
  isHappyPath,
});

/**
 * Builds the investigation decision tree: Trigger → Hypotheses chip → one flat row of hypotheses →
 * Conclusion → Proposed actions. Conclusion and actions are drafts until the run ends, so they are
 * left out while it is still running.
 */
export const buildDecisionGraph = ({
  trigger,
  state,
  isRunning,
  isHypothesesExpanded,
  isActionsExpanded = false,
}: {
  trigger: DecisionTreeTrigger;
  state: InvestigationState;
  isRunning: boolean;
  isHypothesesExpanded: boolean;
  isActionsExpanded?: boolean;
}): DecisionGraph => {
  const { hypotheses, conclusion } = state;
  const recommendations = sortRecommendations(state.recommendations ?? []);
  const winnerIndex = getWinningHypothesisIndex(hypotheses);
  const hasWinner = !isRunning && winnerIndex !== -1;
  const showHypothesisRow = isHypothesesExpanded && hypotheses.length > 0;

  const nodes: DecisionGraphNode[] = [
    { id: DECISION_TREE_NODE_IDS.trigger, data: { kind: 'trigger', trigger } },
    {
      id: DECISION_TREE_NODE_IDS.hypotheses,
      data: {
        kind: 'hypotheses',
        total: hypotheses.length,
        counts: getHypothesisStatusCounts(hypotheses),
        isExpanded: showHypothesisRow,
      },
    },
  ];
  const edges: DecisionGraphEdge[] = [
    createEdge(DECISION_TREE_NODE_IDS.trigger, DECISION_TREE_NODE_IDS.hypotheses, hasWinner),
  ];

  if (showHypothesisRow) {
    hypotheses.forEach((hypothesis, index) => {
      const id = getHypothesisNodeId(index);
      nodes.push({
        id,
        data: {
          kind: 'hypothesis',
          hypothesis,
          index,
          isWinner: hasWinner && index === winnerIndex,
        },
      });
      edges.push(
        createEdge(DECISION_TREE_NODE_IDS.hypotheses, id, hasWinner && index === winnerIndex)
      );
    });
  }

  if (isRunning) {
    return { nodes, edges };
  }

  const feedingIds = showHypothesisRow
    ? hypotheses.map((_, index) => getHypothesisNodeId(index))
    : [DECISION_TREE_NODE_IDS.hypotheses];
  const isFeedingHappy = (id: string): boolean =>
    hasWinner &&
    (showHypothesisRow
      ? id === getHypothesisNodeId(winnerIndex)
      : id === DECISION_TREE_NODE_IDS.hypotheses);

  const conclusionText = conclusion?.trim();
  const hasConclusion = Boolean(conclusionText);
  if (conclusionText) {
    nodes.push({
      id: DECISION_TREE_NODE_IDS.conclusion,
      data: {
        kind: 'conclusion',
        conclusion: conclusionText,
      },
    });
    feedingIds.forEach((id) =>
      edges.push(createEdge(id, DECISION_TREE_NODE_IDS.conclusion, isFeedingHappy(id)))
    );
  }

  if (recommendations.length > 0) {
    nodes.push({
      id: DECISION_TREE_NODE_IDS.actions,
      data: { kind: 'actions', recommendations, isExpanded: isActionsExpanded },
    });
    if (hasConclusion) {
      edges.push(
        createEdge(DECISION_TREE_NODE_IDS.conclusion, DECISION_TREE_NODE_IDS.actions, hasWinner)
      );
    } else {
      feedingIds.forEach((id) =>
        edges.push(createEdge(id, DECISION_TREE_NODE_IDS.actions, isFeedingHappy(id)))
      );
    }
  }

  return { nodes, edges };
};

/**
 * Edges leading into `nodeId` from the Trigger. Where several edges converge (the Conclusion),
 * the happy-path edge is followed when there is one, so selecting a node lights up one route.
 */
export const getPathToNode = (
  edges: readonly DecisionGraphEdge[],
  nodeId: string
): { nodeIds: Set<string>; edgeIds: Set<string> } => {
  const nodeIds = new Set<string>([nodeId]);
  const edgeIds = new Set<string>();
  const queue = [nodeId];

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    const incoming = edges.filter(({ target }) => target === current);
    const happyIncoming = incoming.filter(({ isHappyPath }) => isHappyPath);
    (happyIncoming.length > 0 ? happyIncoming : incoming).forEach(({ id, source }) => {
      edgeIds.add(id);
      if (!nodeIds.has(source)) {
        nodeIds.add(source);
        queue.push(source);
      }
    });
  }

  return { nodeIds, edgeIds };
};
