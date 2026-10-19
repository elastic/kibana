/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionNodeView, DecisionTreeView } from '@kbn/nightshift-decision-trees';
import type { InvestigationTree } from './investigation_knowledge';

/** Graphs are small, but a cycle in an AI-written tree must not loop forever. */
const MAX_PATH_LENGTH = 30;

/** One step of a confirmed path: a check, a decision taken, or the cause it ended at. */
export interface PathStep {
  node_id: string;
  type: DecisionNodeView['node_type'];
  label: string;
  /** Evidence-gatherer metadata: the exact entities the check used. */
  description?: string;
  /** For a decision, the condition of the edge taken out of it. */
  taken?: string;
}

/**
 * A path from a symptom to a cause that investigations confirmed again and again. Its checks
 * are a detector nobody has written yet.
 */
export interface ConfirmedPath {
  tree_id: string;
  symptom: string;
  cause: string;
  steps: PathStep[];
  /** Reinforced turns, each a finished investigation that confirmed this path. */
  confirmations: number;
  last_confirmed_at: string;
}

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** Every taken path of one turn, from a symptom to an end node. */
function takenPaths(tree: DecisionTreeView): PathStep[][] {
  const nodes = new Map(tree.nodes.map((node) => [node.node_id, node]));
  const taken = tree.edges.filter((edge) => edge.is_taken);
  const out = (nodeId: string) => taken.filter((edge) => edge.source_node_id === nodeId);
  const stepOf = (node: DecisionNodeView, condition?: string): PathStep => ({
    node_id: node.node_id,
    type: node.node_type,
    label: node.label,
    description: node.node_metadata?.description,
    taken: node.node_type === 'decision' ? condition : undefined,
  });

  const walk = (nodeId: string, path: PathStep[]): PathStep[][] => {
    const node = nodes.get(nodeId);
    if (!node || path.length > MAX_PATH_LENGTH || path.some((step) => step.node_id === nodeId)) {
      return [];
    }
    if (node.node_type === 'end') {
      return [[...path, stepOf(node)]];
    }
    return out(nodeId).flatMap((edge) =>
      walk(edge.target_node_id, [
        ...path,
        stepOf(node, edge.condition.replace(/^✅\s*/, '').trim() || undefined),
      ])
    );
  };

  return tree.nodes
    .filter((node) => node.node_type === 'symptom')
    .flatMap((symptom) => walk(symptom.node_id, []));
}

/**
 * Confirmed paths across every tree. A path counts once per reinforced turn that marked it, so
 * a path two investigations confirmed has two confirmations. Paths are grouped by the checks on
 * them and the cause they end at, so an AI renaming a node id does not split them.
 */
export function confirmedPaths(trees: InvestigationTree[]): ConfirmedPath[] {
  const grouped = new Map<string, ConfirmedPath>();
  trees.forEach((tree) =>
    tree.turns
      .filter((turn) => turn.reinforced)
      .forEach((turn) =>
        takenPaths(turn.tree).forEach((steps) => {
          const cause = steps[steps.length - 1].label;
          const key = [
            tree.tree_id,
            ...steps.map((step) => `${step.type}:${normalise(step.label)}`),
          ].join('|');
          const existing = grouped.get(key);
          grouped.set(key, {
            tree_id: tree.tree_id,
            symptom: tree.symptom,
            cause,
            // The latest turn's wording wins: later investigations refine metadata.
            steps,
            confirmations: (existing?.confirmations ?? 0) + 1,
            last_confirmed_at:
              existing && existing.last_confirmed_at > turn.at
                ? existing.last_confirmed_at
                : turn.at,
          });
        })
      )
  );
  return [...grouped.values()].sort((a, b) => b.confirmations - a.confirmations);
}
