/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dagLayout } from '@kbn/dag-layout';
import type { DagEdge, DagNode } from '@kbn/dag-layout';
import type { AttackPath, CrownJewelLeaf, PathAnnotation, SpineNode } from './attack_path_model';

/**
 * Pure layout for the attack-path graph. Turns the grounded {@link AttackPath}
 * model into positioned React Flow nodes + edges via a horizontal (LR) dagre
 * layout — the industry-standard auto-layout used across Kibana's React Flow
 * canvases. All geometry lives here (out of React) so node placement, the
 * spine → crown-jewel branching, and the no-overlap invariants are deterministic
 * and unit tested.
 *
 * Findings (alerts/activity) are NOT separate nodes — they are attached to the
 * spine node they belong to (a count + the list), so the graph stays clean and
 * findings read as node properties, the way Wiz/Prowler attach findings to
 * resources.
 */

/** React Flow node kinds we render. */
export type AttackPathNodeType = 'entity' | 'origin' | 'resource';

/** A grounded finding attached to a node (from a {@link PathAnnotation}). */
export interface NodeFinding {
  id: string;
  kind: PathAnnotation['kind'];
  text: string;
  severity: PathAnnotation['severity'];
}

/** Data carried by an entity/origin spine node. */
export interface EntityNodeData extends Record<string, unknown> {
  spine: SpineNode;
  /** Kill-chain stage label for the node (localized), if any. */
  stageLabel: string | undefined;
  /** Grounded findings attached to this node. */
  findings: readonly NodeFinding[];
  /** Whether this node is on the focused path (bright) vs dimmed. */
  focusState: 'none' | 'highlighted' | 'dimmed';
}

/** Data carried by a crown-jewel / resource leaf node. */
export interface ResourceNodeData extends Record<string, unknown> {
  leaf: CrownJewelLeaf;
  focusState: 'none' | 'highlighted' | 'dimmed';
}

export interface LaidOutFlowNode {
  id: string;
  type: AttackPathNodeType;
  position: { x: number; y: number };
  width: number;
  height: number;
  data: EntityNodeData | ResourceNodeData;
}

/** Relationship kind an edge represents, for edge styling. */
export type AttackPathEdgeKind = 'spine' | 'branch';

export interface LaidOutFlowEdge {
  id: string;
  source: string;
  target: string;
  kind: AttackPathEdgeKind;
  /** Transition/relationship label (localized upstream), if any. */
  label: string | undefined;
  /** Worst severity of the target, for edge tinting. */
  severity: PathAnnotation['severity'];
}

export interface AttackPathGraphLayout {
  nodes: readonly LaidOutFlowNode[];
  edges: readonly LaidOutFlowEdge[];
}

/** Type guard: node data belongs to an entity/origin spine node. */
export const isEntityNodeData = (data: EntityNodeData | ResourceNodeData): data is EntityNodeData =>
  'spine' in data;

/** Type guard: node data belongs to a crown-jewel / resource leaf node. */
export const isResourceNodeData = (
  data: EntityNodeData | ResourceNodeData
): data is ResourceNodeData => 'leaf' in data;

export interface AttackPathLayoutOptions {
  /** Cross-axis spacing between ranks of nodes (dagre nodeSep). */
  nodeSep?: number;
  /** Main-axis spacing between ranks (dagre rankSep). */
  rankSep?: number;
  /** Spine node box size. */
  entitySize?: { width: number; height: number };
  /** Resource leaf box size. */
  resourceSize?: { width: number; height: number };
}

const DEFAULTS = {
  nodeSep: 90,
  rankSep: 180,
  entitySize: { width: 220, height: 132 },
  resourceSize: { width: 190, height: 96 },
};

/** Groups the path annotations by the spine node they anchor to. */
const findingsByNode = (annotations: readonly PathAnnotation[]): Map<string, NodeFinding[]> => {
  const map = new Map<string, NodeFinding[]>();
  for (const annotation of annotations) {
    const list = map.get(annotation.nodeId) ?? [];
    list.push({
      id: annotation.id,
      kind: annotation.kind,
      text: annotation.text,
      severity: annotation.severity,
    });
    map.set(annotation.nodeId, list);
  }
  return map;
};

/**
 * Computes the positioned graph for correlated activity. Neighbors connect only to the focus; crown-jewel leaves branch off their parent (dagre routes them
 * onto their own ranks so they never overlap the spine). Returns absolute
 * top-left positions ready for React Flow (dagre centers are converted).
 */
export const layoutAttackPathGraph = (
  path: AttackPath,
  options: AttackPathLayoutOptions = {}
): AttackPathGraphLayout => {
  const nodeSep = options.nodeSep ?? DEFAULTS.nodeSep;
  const rankSep = options.rankSep ?? DEFAULTS.rankSep;
  const entitySize = options.entitySize ?? DEFAULTS.entitySize;
  const resourceSize = options.resourceSize ?? DEFAULTS.resourceSize;

  const findings = findingsByNode(path.annotations);
  const stageLabelByStage = new Map(path.stages.map((band) => [band.stage, band.label]));

  const dagNodes: DagNode[] = [];
  const dagEdges: DagEdge[] = [];

  const focus = path.spine.find((node) => node.kind !== 'origin');
  const connections = path.spine.flatMap((node) => {
    if (!focus || node.id === focus.id) return [];
    return [
      {
        source: node.kind === 'origin' ? node.id : focus.id,
        target: node.kind === 'origin' ? focus.id : node.id,
        node,
      },
    ];
  });
  for (const node of path.spine) {
    dagNodes.push({ id: node.id, width: entitySize.width, height: entitySize.height });
  }
  for (const connection of connections) {
    dagEdges.push({
      id: `spine:${connection.source}->${connection.target}`,
      source: connection.source,
      target: connection.target,
    });
  }

  // Crown-jewel leaves + branch edges from their parent spine node.
  for (const leaf of path.crownJewels) {
    dagNodes.push({ id: leaf.id, width: resourceSize.width, height: resourceSize.height });
    dagEdges.push({
      id: `branch:${leaf.nodeId}->${leaf.id}`,
      source: leaf.nodeId,
      target: leaf.id,
    });
  }

  const laid = dagLayout(dagNodes, dagEdges, [], { direction: 'LR', nodeSep, rankSep });
  const positionById = new Map(laid.nodes.map((n) => [n.id, n]));

  const spineById = new Map(path.spine.map((node) => [node.id, node]));

  const flowNodes: LaidOutFlowNode[] = [];

  for (const node of path.spine) {
    const pos = positionById.get(node.id);
    if (pos) {
      flowNodes.push({
        id: node.id,
        type: node.kind === 'origin' ? 'origin' : 'entity',
        // dagre returns center coords; React Flow expects top-left.
        position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
        width: pos.width,
        height: pos.height,
        data: {
          spine: node,
          stageLabel: node.stage ? stageLabelByStage.get(node.stage) : undefined,
          findings: findings.get(node.id) ?? [],
          focusState: 'none',
        },
      });
    }
  }

  for (const leaf of path.crownJewels) {
    const pos = positionById.get(leaf.id);
    if (pos) {
      flowNodes.push({
        id: leaf.id,
        type: 'resource',
        position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
        width: pos.width,
        height: pos.height,
        data: { leaf, focusState: 'none' },
      });
    }
  }

  const flowEdges: LaidOutFlowEdge[] = [];
  for (const { source, target, node } of connections) {
    flowEdges.push({
      id: `spine:${source}->${target}`,
      source,
      target,
      kind: 'spine',
      label: node.transition,
      severity: node.worstSeverity,
    });
  }
  for (const leaf of path.crownJewels) {
    const parent = spineById.get(leaf.nodeId);
    flowEdges.push({
      id: `branch:${leaf.nodeId}->${leaf.id}`,
      source: leaf.nodeId,
      target: leaf.id,
      kind: 'branch',
      label: undefined,
      severity: leaf.severity ?? parent?.worstSeverity,
    });
  }

  return { nodes: flowNodes, edges: flowEdges };
};
