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
export const DIAGRAM_ROW_HEIGHT = 132;
export const DIAGRAM_CARD_HEIGHT = 112;
/** Minimum diagram height (px): comfortably fits 4 entities at flyout size l. */
export const DIAGRAM_MIN_HEIGHT = 300;
const DIAGRAM_PADDING = 12;
/** Minimum vertical distance between two inline edge labels (px). */
export const DIAGRAM_LABEL_GAP = 36;
const LABEL_POSITIONS = Array.from(
  { length: 31 },
  (_, i) => 0.5 + (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 0.02
);

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
  /** Position of the label along the connector (0 = left card, 1 = right card). */
  labelT: number;
  /** Vertical centre of the label (px); equals the connector height at labelT. */
  labelY: number;
}

export interface StorylineDiagramLayout {
  height: number;
  nodes: DiagramNode[];
  pairs: DiagramPair[];
}

const columnOf = (type: BriefEntity['type'] | undefined): DiagramColumn =>
  type === 'user' || type === 'generic' ? 'left' : 'right';

/**
 * Chooses a position along each cross-column connector so labels keep DIAGRAM_LABEL_GAP apart:
 * bounded backtracking, preferring the middle of the line. Falls back to the best greedy choice.
 */
const placeLabels = (pairs: DiagramPair[], nodeById: Map<string, DiagramNode>): void => {
  const items = pairs
    .filter(({ sameColumn }) => !sameColumn)
    .flatMap((pair) => {
      const a = nodeById.get(pair.from);
      const b = nodeById.get(pair.to);
      if (!a || !b) return [];
      const [left, right] = a.column === 'left' ? [a, b] : [b, a];
      return [{ pair, y0: left.cy, dy: right.cy - left.cy }];
    })
    // Flat connectors have no freedom, so place them first.
    .sort((x, y) => Math.abs(x.dy) - Math.abs(y.dy));

  const chosen: number[] = [];
  let budget = 20000;
  const search = (index: number): boolean => {
    if (index === items.length) return true;
    const { y0, dy } = items[index];
    const candidates = dy === 0 ? [0.5] : LABEL_POSITIONS;
    for (const t of candidates) {
      budget -= 1;
      if (budget < 0) return false;
      const y = y0 + t * dy;
      if (ys.slice(0, index).every((placedY) => Math.abs(placedY - y) >= DIAGRAM_LABEL_GAP)) {
        chosen[index] = t;
        ys[index] = y;
        if (search(index + 1)) return true;
      }
    }
    return false;
  };
  const ys: number[] = [];
  const solved = search(0);

  items.forEach(({ pair, y0, dy }, index) => {
    let t = chosen[index] ?? 0.5;
    if (!solved) {
      const prior = items.slice(0, index).map((_, i) => ys[i] ?? 0);
      const clearance = (candidate: number) =>
        prior.reduce(
          (min, placed) => Math.min(min, Math.abs(placed - (y0 + candidate * dy))),
          Infinity
        );
      t = LABEL_POSITIONS.reduce((best, c) => (clearance(c) > clearance(best) ? c : best), 0.5);
      ys[index] = y0 + t * dy;
    }
    pair.labelT = t;
    pair.labelY = y0 + t * dy;
  });
};

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

  const nodeById = new Map(nodes.map((node) => [node.euid, node]));
  const pairs: DiagramPair[] = Array.from(grouped.values()).map(({ from, to, verbs, weak }) => {
    const sameColumn = assigned.get(from) === assigned.get(to);
    const sorted = Array.from(verbs.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([verb]) => verb);
    return {
      from,
      to,
      label: sorted[0],
      verbs: sorted,
      weak,
      sameColumn,
      labelT: 0.5,
      labelY: 0,
    };
  });

  placeLabels(pairs, nodeById);

  return { height, nodes, pairs };
};
