/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { STORY_EDGE_CONFIG } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefEntity,
  BriefSnapshot,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';

export type DiagramColumn = 'left' | 'right';

/** Vertical pitch of one entity row and the card height inside it (px). */
export const DIAGRAM_ROW_HEIGHT = 76;
export const DIAGRAM_CARD_HEIGHT = 58;
/** Minimum diagram height (px): comfortably fits 4 entities at flyout size l. */
export const DIAGRAM_MIN_HEIGHT = 260;
const DIAGRAM_PADDING = 12;

export interface DiagramNode {
  euid: string;
  column: DiagramColumn;
  /** Row index within the column. */
  index: number;
  /** Vertical centre of the card (px from the diagram top). */
  cy: number;
  entity: BriefEntity | undefined;
  isHub: boolean;
}

export interface DiagramPair {
  /** Entity ids, ordered by storyline entity order. */
  from: string;
  to: string;
  /** Strongest verb by STORY_EDGE_CONFIG weight. */
  label: string;
  /** All distinct verbs, strongest first. */
  verbs: string[];
  /** True when every contributing edge is an "attach" (weak) edge. */
  weak: boolean;
  /** True when both entities sit in the same column (drawn as a side arc, not labelled inline). */
  sameColumn: boolean;
}

export interface StorylineDiagramLayout {
  height: number;
  nodes: DiagramNode[];
  pairs: DiagramPair[];
}

const columnOf = (type: BriefEntity['type'] | undefined): DiagramColumn =>
  type === 'user' || type === 'generic' ? 'left' : 'right';

/**
 * Deterministic two-column layout: users/identities left, hosts/services right, one connector per
 * entity pair labelled with its strongest edge verb.
 */
export const buildStorylineGraphLayout = (
  storyline: Storyline,
  snapshot: BriefSnapshot
): StorylineDiagramLayout => {
  const euids = storyline.entityEuids.filter((euid) => snapshot.entities[euid] !== undefined);
  const assigned = new Map<string, DiagramColumn>(
    euids.map((euid) => [euid, columnOf(snapshot.entities[euid]?.type)])
  );

  // One-sided stories (e.g. only hosts) would leave a column empty: split them across both.
  const leftCount = euids.filter((euid) => assigned.get(euid) === 'left').length;
  if (euids.length > 1 && (leftCount === 0 || leftCount === euids.length)) {
    euids.forEach((euid, index) => assigned.set(euid, index % 2 === 0 ? 'left' : 'right'));
  }

  const columns: Record<DiagramColumn, string[]> = {
    left: euids.filter((euid) => assigned.get(euid) === 'left'),
    right: euids.filter((euid) => assigned.get(euid) === 'right'),
  };
  const rows = Math.max(columns.left.length, columns.right.length, 1);
  const height = Math.max(DIAGRAM_MIN_HEIGHT, rows * DIAGRAM_ROW_HEIGHT + 2 * DIAGRAM_PADDING);

  const nodes: DiagramNode[] = [];
  (['left', 'right'] as const).forEach((column) => {
    const list = columns[column];
    const top = (height - list.length * DIAGRAM_ROW_HEIGHT) / 2;
    list.forEach((euid, index) => {
      const entity = snapshot.entities[euid];
      nodes.push({
        euid,
        column,
        index,
        cy: top + index * DIAGRAM_ROW_HEIGHT + DIAGRAM_ROW_HEIGHT / 2,
        entity,
        isHub: entity?.isHub === true || storyline.hubEuids.includes(euid),
      });
    });
  });

  const order = new Map(euids.map((euid, index) => [euid, index]));
  const grouped = new Map<
    string,
    { from: string; to: string; verbs: Map<string, number>; weak: boolean }
  >();
  storyline.edges.forEach((edge) => {
    const config = STORY_EDGE_CONFIG[edge.type];
    if (config.role === 'context' || edge.from === edge.to) return;
    const fromRank = order.get(edge.from);
    const toRank = order.get(edge.to);
    if (fromRank === undefined || toRank === undefined) return;
    const [from, to] = fromRank <= toRank ? [edge.from, edge.to] : [edge.to, edge.from];
    const key = `${from}\u0000${to}`;
    const group = grouped.get(key) ?? { from, to, verbs: new Map<string, number>(), weak: true };
    group.verbs.set(config.verb, Math.max(group.verbs.get(config.verb) ?? 0, config.weight));
    group.weak = group.weak && config.role === 'attach';
    grouped.set(key, group);
  });

  const pairs: DiagramPair[] = Array.from(grouped.values()).map(({ from, to, verbs, weak }) => {
    const sorted = Array.from(verbs.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([verb]) => verb);
    return {
      from,
      to,
      label: sorted[0],
      verbs: sorted,
      weak,
      sameColumn: assigned.get(from) === assigned.get(to),
    };
  });

  return { height, nodes, pairs };
};
