/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../common/entity_analytics/types';
import type { EdgeContext } from './event_context';
import type { AlertSeverity, RelatedEntityKind } from './hooks/use_entity_relationships';

export type { EdgeContext } from './event_context';
export { EMPTY_EDGE_CONTEXT } from './event_context';

export const GRAPH_NODE_CAP = 50;

/**
 * Maximum neighbor entities placed directly on the canvas per expansion. Any
 * surplus is folded into a single "show N more" group node so a busy entity
 * does not blanket the layout with unreadable, overlapping nodes.
 */
export const BRANCH_VISIBLE_LIMIT = 6;

export type TimeRangePreset = '24h' | '7d' | '30d' | '90d';
export type GraphEntityKind = RelatedEntityKind;

export interface EntityGraphNode {
  nodeType: 'entity';
  id: string;
  name: string;
  /** Raw ECS identifier used for alert queries, distinct from composite display names. */
  identifierValue: string;
  kind: GraphEntityKind;
  parentId: string | undefined;
  alertCount: number;
  worstSeverity: AlertSeverity | undefined;
  riskScore: number | undefined;
  /**
   * Real event activity between this node and its parent, pulled from `logs-*`.
   * Empty when no matching events were found (view falls back to alert counts).
   */
  context: EdgeContext;
}

export interface AlertEvidence {
  id: string;
  ruleName: string;
  title: string | undefined;
  severity: AlertSeverity | undefined;
  status: string | undefined;
  timestamp: string | undefined;
  eventKind: string | undefined;
  eventCategory: readonly string[];
  users: readonly string[];
  hosts: readonly string[];
  services: readonly string[];
  sourceIps: readonly string[];
  destinationIps: readonly string[];
  processName: string | undefined;
  processExecutable: string | undefined;
}

export interface AlertGraphNode {
  nodeType: 'alert';
  id: string;
  name: string;
  parentId: string;
  alert: AlertEvidence;
}

/**
 * Synthetic node created when a neighborhood returns more entities than we want
 * to place on the canvas at once. Represents the overflow entities that were
 * held back; clicking it reveals the next batch instead of flooding the layout.
 */
export interface GroupGraphNode {
  nodeType: 'group';
  id: string;
  parentId: string;
  kind: GraphEntityKind;
  /** Entities held back from placement, ordered by descending alert count. */
  hidden: readonly EntityGraphNode[];
}

export type GraphNode = EntityGraphNode | AlertGraphNode | GroupGraphNode;

export interface RelationshipGraphEdge {
  edgeType: 'relationship';
  id: string;
  source: string;
  target: string;
  alertCount: number;
  worstSeverity: AlertSeverity | undefined;
  /** Real event activity summarizing what happened source→target. */
  context: EdgeContext;
}

export interface EvidenceGraphEdge {
  edgeType: 'evidence';
  id: string;
  source: string;
  target: string;
}

export type GraphEdge = RelationshipGraphEdge | EvidenceGraphEdge;

export interface GraphState {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  expandedNodeIds: ReadonlySet<string>;
  capped: boolean;
}

export interface GraphNeighborhood {
  parentId: string;
  nodes: readonly EntityGraphNode[];
  edges: readonly RelationshipGraphEdge[];
}

export const entityNodeId = (kind: GraphEntityKind, name: string): string => `${kind}:${name}`;

export const toEntityType = (kind: GraphEntityKind): EntityType | undefined =>
  kind === 'ip' ? undefined : kind;

export const createGraphState = (root: EntityGraphNode): GraphState => ({
  nodes: [root],
  edges: [],
  expandedNodeIds: new Set(),
  capped: false,
});

export const mergeNeighborhood = (
  state: GraphState,
  neighborhood: GraphNeighborhood,
  cap: number = GRAPH_NODE_CAP
): GraphState => {
  const nodeById = new Map(state.nodes.map((node) => [node.id, node]));
  let capped = state.capped;

  for (const node of neighborhood.nodes) {
    const existing = nodeById.get(node.id);
    if (existing?.nodeType === 'entity') {
      nodeById.set(node.id, {
        ...existing,
        alertCount: Math.max(existing.alertCount, node.alertCount),
        worstSeverity: node.worstSeverity ?? existing.worstSeverity,
        context: node.context.totalEvents > 0 ? node.context : existing.context,
      });
    } else if (!existing) {
      if (nodeById.size >= cap) {
        capped = true;
      } else {
        nodeById.set(node.id, node);
      }
    }
  }

  const visibleNodeIds = new Set(nodeById.keys());
  const edgeById = new Map(state.edges.map((edge) => [edge.id, edge]));
  for (const edge of neighborhood.edges) {
    if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
      edgeById.set(edge.id, edge);
    }
  }

  return {
    nodes: [...nodeById.values()],
    edges: [...edgeById.values()],
    expandedNodeIds: new Set([...state.expandedNodeIds, neighborhood.parentId]),
    capped,
  };
};

export const mergeAlertEvidence = (
  state: GraphState,
  parentId: string,
  alerts: readonly AlertEvidence[],
  cap: number = GRAPH_NODE_CAP
): GraphState => {
  const nodeById = new Map(state.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(state.edges.map((edge) => [edge.id, edge]));
  let capped = state.capped;

  for (const alert of alerts) {
    const id = `alert:${alert.id}`;
    if (!nodeById.has(id)) {
      if (nodeById.size >= cap) {
        capped = true;
      } else {
        nodeById.set(id, {
          nodeType: 'alert',
          id,
          name: alert.ruleName,
          parentId,
          alert,
        });
      }
    }
    if (nodeById.has(id)) {
      edgeById.set(`evidence:${parentId}:${id}`, {
        edgeType: 'evidence',
        id: `evidence:${parentId}:${id}`,
        source: parentId,
        target: id,
      });
    }
  }

  return {
    ...state,
    nodes: [...nodeById.values()],
    edges: [...edgeById.values()],
    capped,
  };
};

export const collapseBranch = (state: GraphState, parentId: string): GraphState => {
  const childIds = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of state.nodes) {
      if (
        node.id !== parentId &&
        node.parentId !== undefined &&
        (node.parentId === parentId || childIds.has(node.parentId)) &&
        !childIds.has(node.id)
      ) {
        childIds.add(node.id);
        changed = true;
      }
    }
  }

  const expandedNodeIds = new Set(state.expandedNodeIds);
  expandedNodeIds.delete(parentId);
  for (const id of childIds) expandedNodeIds.delete(id);

  return {
    nodes: state.nodes.filter((node) => !childIds.has(node.id)),
    edges: state.edges.filter((edge) => !childIds.has(edge.source) && !childIds.has(edge.target)),
    expandedNodeIds,
    capped: false,
  };
};

/** Stable id for the synthetic overflow node attached to a given parent. */
export const groupNodeId = (parentId: string): string => `group:${parentId}`;

/**
 * Splits a freshly fetched neighborhood into the entities we place immediately
 * and the overflow that gets folded into a single group node. Entities are kept
 * in the order they arrive (already sorted by descending alert count upstream),
 * so the strongest relationships stay on the canvas.
 */
export const splitNeighborhood = (
  parentId: string,
  related: readonly EntityGraphNode[],
  visibleLimit: number = BRANCH_VISIBLE_LIMIT
): { neighborhood: GraphNeighborhood; group: GroupGraphNode | undefined } => {
  const visible = related.slice(0, Math.max(0, visibleLimit));
  const hidden = related.slice(Math.max(0, visibleLimit));
  const neighborhood: GraphNeighborhood = {
    parentId,
    nodes: visible,
    edges: visible.map((node) => ({
      edgeType: 'relationship',
      id: `relationship:${parentId}:${node.id}`,
      source: parentId,
      target: node.id,
      alertCount: node.alertCount,
      worstSeverity: node.worstSeverity,
      context: node.context,
    })),
  };
  const group: GroupGraphNode | undefined =
    hidden.length > 0
      ? {
          nodeType: 'group',
          id: groupNodeId(parentId),
          parentId,
          kind: hidden[0].kind,
          hidden,
        }
      : undefined;
  return { neighborhood, group };
};

/**
 * Attaches (or refreshes) a group node in the graph. The group node is never
 * counted against the visible cap because it stands in for many entities.
 */
export const attachGroupNode = (state: GraphState, group: GroupGraphNode): GraphState => {
  const nodeById = new Map(state.nodes.map((node) => [node.id, node]));
  nodeById.set(group.id, group);
  return { ...state, nodes: [...nodeById.values()] };
};

/**
 * Promotes the next batch of hidden entities from a group node onto the canvas.
 * Returns the entities that should be merged plus the shrunken (or removed)
 * group. Keeping this pure lets the view merge results through the usual paths.
 */
export const expandGroup = (
  state: GraphState,
  groupId: string,
  batchSize: number = BRANCH_VISIBLE_LIMIT
): { neighborhood: GraphNeighborhood; state: GraphState } | undefined => {
  const group = state.nodes.find(
    (node): node is GroupGraphNode => node.nodeType === 'group' && node.id === groupId
  );
  if (!group) return undefined;
  const promoted = group.hidden.slice(0, Math.max(1, batchSize));
  const remaining = group.hidden.slice(Math.max(1, batchSize));
  const { parentId } = group;
  const neighborhood: GraphNeighborhood = {
    parentId,
    nodes: promoted,
    edges: promoted.map((node) => ({
      edgeType: 'relationship',
      id: `relationship:${parentId}:${node.id}`,
      source: parentId,
      target: node.id,
      alertCount: node.alertCount,
      worstSeverity: node.worstSeverity,
      context: node.context,
    })),
  };
  const nodes =
    remaining.length > 0
      ? state.nodes.map((node) => (node.id === groupId ? { ...group, hidden: remaining } : node))
      : state.nodes.filter((node) => node.id !== groupId);
  return { neighborhood, state: { ...state, nodes } };
};

const EDGE_MIN_WIDTH = 1.5;
const EDGE_MAX_WIDTH = 6;

/**
 * Maps a shared-alert count to an edge stroke width so heavier relationships
 * read as thicker lines. Uses a log scale (relative to the busiest edge) so a
 * single dominant edge does not flatten everything else to the minimum.
 */
export const edgeStrokeWidth = (
  alertCount: number,
  maxAlertCount: number,
  selected = false
): number => {
  const safeMax = Math.max(1, maxAlertCount);
  const ratio = Math.log1p(Math.max(0, alertCount)) / Math.log1p(safeMax);
  const base = EDGE_MIN_WIDTH + ratio * (EDGE_MAX_WIDTH - EDGE_MIN_WIDTH);
  const rounded = Math.round(base * 10) / 10;
  return selected ? Math.max(rounded, EDGE_MIN_WIDTH) + 1.5 : rounded;
};

/**
 * Deterministic order used for keyboard navigation between entity nodes: the
 * root first, then breadth-first by parent, tie-broken by descending alert
 * count then id. Group/alert nodes are excluded — arrow keys walk entities.
 */
export const orderedEntityIdsForNavigation = (nodes: readonly GraphNode[]): string[] => {
  const entities = nodes.filter((node): node is EntityGraphNode => node.nodeType === 'entity');
  const root = entities.find((node) => node.parentId === undefined);
  if (!root) return entities.map(({ id }) => id);
  const ordered: string[] = [root.id];
  const seen = new Set<string>([root.id]);
  let frontier = [root.id];
  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const parentId of frontier) {
      const children = entities
        .filter((node) => node.parentId === parentId && !seen.has(node.id))
        .sort((left, right) =>
          right.alertCount !== left.alertCount
            ? right.alertCount - left.alertCount
            : left.id.localeCompare(right.id)
        );
      for (const child of children) {
        ordered.push(child.id);
        seen.add(child.id);
        nextFrontier.push(child.id);
      }
    }
    frontier = nextFrontier;
  }
  for (const entity of entities) {
    if (!seen.has(entity.id)) {
      ordered.push(entity.id);
      seen.add(entity.id);
    }
  }
  return ordered;
};
