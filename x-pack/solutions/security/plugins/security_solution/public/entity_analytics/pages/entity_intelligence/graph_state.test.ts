/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { AlertEvidence, EntityGraphNode, GraphNeighborhood } from './graph_state';
import { EMPTY_EDGE_CONTEXT } from './event_context';
import {
  attachGroupNode,
  collapseBranch,
  createGraphState,
  edgeStrokeWidth,
  expandGroup,
  groupNodeId,
  mergeAlertEvidence,
  mergeNeighborhood,
  orderedEntityIdsForNavigation,
  splitNeighborhood,
} from './graph_state';
import { layoutGraphNodes } from './relationship_graph';

const node = (id: string, parentId: string | undefined = 'user:root'): EntityGraphNode => ({
  nodeType: 'entity',
  id,
  name: id.split(':')[1],
  identifierValue: id.split(':')[1],
  kind: EntityType.user,
  parentId,
  alertCount: 2,
  worstSeverity: 'medium',
  riskScore: undefined,
  context: EMPTY_EDGE_CONTEXT,
});

const root: EntityGraphNode = { ...node('user:root'), parentId: undefined };

const neighborhood = (
  parentId: string,
  children: readonly EntityGraphNode[]
): GraphNeighborhood => ({
  parentId,
  nodes: children,
  edges: children.map((child) => ({
    edgeType: 'relationship',
    id: `relationship:${parentId}:${child.id}`,
    source: parentId,
    target: child.id,
    alertCount: child.alertCount,
    worstSeverity: child.worstSeverity,
    context: EMPTY_EDGE_CONTEXT,
  })),
});

describe('entity intelligence graph state', () => {
  it('merges and deduplicates neighborhoods by stable IDs', () => {
    const first = mergeNeighborhood(
      createGraphState(root),
      neighborhood(root.id, [node('user:alice'), node('user:bob')])
    );
    const second = mergeNeighborhood(
      first,
      neighborhood(root.id, [{ ...node('user:alice'), alertCount: 8 }])
    );

    expect(second.nodes).toHaveLength(3);
    expect(second.edges).toHaveLength(2);
    expect(second.expandedNodeIds.has(root.id)).toBe(true);
    expect(second.nodes.find(({ id }) => id === 'user:alice')).toMatchObject({ alertCount: 8 });
  });

  it('enforces the visible node cap without dropping existing nodes', () => {
    const result = mergeNeighborhood(
      createGraphState(root),
      neighborhood(root.id, [node('user:a'), node('user:b'), node('user:c')]),
      3
    );

    expect(result.nodes).toHaveLength(3);
    expect(result.capped).toBe(true);
  });

  it('converts evidence into deduplicated alert nodes and edges', () => {
    const alert: AlertEvidence = {
      id: 'alert-1',
      ruleName: 'Suspicious process',
      title: undefined,
      severity: 'high',
      status: 'open',
      timestamp: '2026-07-16T00:00:00.000Z',
      eventKind: 'signal',
      eventCategory: ['process'],
      users: ['alice'],
      hosts: ['host-1'],
      services: [],
      sourceIps: [],
      destinationIps: [],
      processName: 'bash',
      processExecutable: '/bin/bash',
    };

    const once = mergeAlertEvidence(createGraphState(root), root.id, [alert]);
    const twice = mergeAlertEvidence(once, root.id, [alert]);
    expect(twice.nodes).toHaveLength(2);
    expect(twice.edges).toHaveLength(1);
    expect(twice.nodes[1]).toMatchObject({ nodeType: 'alert', id: 'alert:alert-1' });
  });

  it('collapses descendants while preserving the selected branch root', () => {
    const first = mergeNeighborhood(
      createGraphState(root),
      neighborhood(root.id, [node('user:alice')])
    );
    const second = mergeNeighborhood(
      first,
      neighborhood('user:alice', [node('user:bob', 'user:alice')])
    );
    const collapsed = collapseBranch(second, 'user:alice');

    expect(collapsed.nodes.map(({ id }) => id)).toEqual(['user:root', 'user:alice']);
    expect(collapsed.expandedNodeIds.has('user:alice')).toBe(false);
  });

  it('centers the root in the available canvas and reserves drawer space', () => {
    const positions = layoutGraphNodes(
      [root, node('user:alice')],
      { width: 1200, height: 800 },
      400
    );

    expect(positions.get(root.id)).toEqual({ x: 400, y: 400 });
    expect(positions.get('user:alice')).toBeDefined();
  });

  it('places expanded branches outward from their parent', () => {
    const parent = node('user:alice');
    const child = node('user:bob', parent.id);
    const positions = layoutGraphNodes([root, parent, child], { width: 1200, height: 800 });
    const rootPosition = positions.get(root.id);
    const parentPosition = positions.get(parent.id);
    const childPosition = positions.get(child.id);

    expect(rootPosition).toBeDefined();
    expect(parentPosition).toBeDefined();
    expect(childPosition).toBeDefined();
    expect(
      Math.hypot(
        (childPosition?.x ?? 0) - (rootPosition?.x ?? 0),
        (childPosition?.y ?? 0) - (rootPosition?.y ?? 0)
      )
    ).toBeGreaterThan(
      Math.hypot(
        (parentPosition?.x ?? 0) - (rootPosition?.x ?? 0),
        (parentPosition?.y ?? 0) - (rootPosition?.y ?? 0)
      )
    );
  });

  it('keeps a crowded root ring free of node overlap by spilling to outer rings', () => {
    const many = Array.from({ length: 16 }, (_, index) => node(`user:n${index}`));
    const positions = layoutGraphNodes([root, ...many], { width: 1400, height: 1000 });
    const points = many
      .map(({ id }) => positions.get(id))
      .filter((position): position is { x: number; y: number } => position !== undefined);

    expect(points).toHaveLength(many.length);
    let minDistance = Infinity;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        minDistance = Math.min(
          minDistance,
          Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)
        );
      }
    }
    // No two nodes sit closer than ~one node+badge footprint.
    expect(minDistance).toBeGreaterThan(60);
  });

  it('folds overflow neighbors into a single group node', () => {
    const related = ['a', 'b', 'c', 'd', 'e'].map((name) => node(`user:${name}`));
    const { neighborhood: built, group } = splitNeighborhood(root.id, related, 3);

    expect(built.nodes.map(({ id }) => id)).toEqual(['user:a', 'user:b', 'user:c']);
    expect(built.edges).toHaveLength(3);
    expect(group).toMatchObject({ nodeType: 'group', id: groupNodeId(root.id), parentId: root.id });
    expect(group?.hidden.map(({ id }) => id)).toEqual(['user:d', 'user:e']);
  });

  it('does not create a group node when everything fits', () => {
    const related = ['a', 'b'].map((name) => node(`user:${name}`));
    const { group } = splitNeighborhood(root.id, related, 6);
    expect(group).toBeUndefined();
  });

  it('promotes the next batch from a group and shrinks it', () => {
    const related = ['a', 'b', 'c', 'd', 'e'].map((name) => node(`user:${name}`));
    const { neighborhood: built, group } = splitNeighborhood(root.id, related, 3);
    if (!group) throw new Error('expected a group node');
    const withGroup = attachGroupNode(mergeNeighborhood(createGraphState(root), built), group);

    const promotion = expandGroup(withGroup, groupNodeId(root.id), 1);
    if (!promotion) throw new Error('expected a promotion');
    expect(promotion.neighborhood.nodes.map(({ id }) => id)).toEqual(['user:d']);
    const merged = mergeNeighborhood(promotion.state, promotion.neighborhood);
    expect(merged.nodes.find(({ id }) => id === 'user:d')).toBeDefined();
    const remainingGroup = merged.nodes.find(({ id }) => id === groupNodeId(root.id));
    expect(remainingGroup).toMatchObject({ nodeType: 'group' });
  });

  it('removes the group node once its last hidden entity is promoted', () => {
    const related = ['a', 'b', 'c', 'd'].map((name) => node(`user:${name}`));
    const { neighborhood: built, group } = splitNeighborhood(root.id, related, 3);
    if (!group) throw new Error('expected a group node');
    const withGroup = attachGroupNode(mergeNeighborhood(createGraphState(root), built), group);

    const promotion = expandGroup(withGroup, groupNodeId(root.id), 6);
    expect(promotion?.neighborhood.nodes.map(({ id }) => id)).toEqual(['user:d']);
    expect(promotion?.state.nodes.find(({ id }) => id === groupNodeId(root.id))).toBeUndefined();
  });

  it('scales edge width by shared-alert count on a log curve', () => {
    const light = edgeStrokeWidth(1, 100);
    const heavy = edgeStrokeWidth(100, 100);
    expect(heavy).toBeGreaterThan(light);
    expect(edgeStrokeWidth(50, 100, true)).toBeGreaterThan(edgeStrokeWidth(50, 100, false));
    // Guards against divide-by-zero when no edges carry alerts.
    expect(Number.isFinite(edgeStrokeWidth(0, 0))).toBe(true);
  });

  it('orders entities root-first, breadth-first by descending alert count', () => {
    const alice = { ...node('user:alice'), alertCount: 5 };
    const bob = { ...node('user:bob'), alertCount: 9 };
    const grandchild = node('user:carol', 'user:bob');
    const state = mergeNeighborhood(
      mergeNeighborhood(createGraphState(root), neighborhood(root.id, [alice, bob])),
      neighborhood('user:bob', [grandchild])
    );

    expect(orderedEntityIdsForNavigation(state.nodes)).toEqual([
      'user:root',
      'user:bob',
      'user:alice',
      'user:carol',
    ]);
  });
});
