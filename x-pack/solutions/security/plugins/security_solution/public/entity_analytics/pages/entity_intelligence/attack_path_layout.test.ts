/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import { layoutAttackPathGraph, isEntityNodeData } from './attack_path_layout';
import type { AttackPath, CrownJewelLeaf, PathAnnotation, SpineNode } from './attack_path_model';

const spineNode = (over: Partial<SpineNode> & Pick<SpineNode, 'id' | 'name'>): SpineNode => ({
  kind: EntityType.host,
  identifierValue: over.name,
  alertCount: 3,
  worstSeverity: 'high',
  stage: 'lateral-movement',
  transition: undefined,
  ...over,
});

const annotation = (
  over: Partial<PathAnnotation> & Pick<PathAnnotation, 'id' | 'nodeId'>
): PathAnnotation => ({
  kind: 'alert',
  text: 'Some finding',
  severity: 'high',
  above: true,
  ...over,
});

const jewel = (
  over: Partial<CrownJewelLeaf> & Pick<CrownJewelLeaf, 'id' | 'nodeId' | 'name'>
): CrownJewelLeaf => ({
  kind: 'sensitive-host',
  reason: 'sensitive',
  severity: 'critical',
  reachedFrom: over.nodeId,
  alertCount: 2,
  ...over,
});

const basePath = (over: Partial<AttackPath> = {}): AttackPath => ({
  spine: [
    spineNode({
      id: 'host:docker-host-prod-01',
      name: 'docker-host-prod-01',
      stage: 'initial-access',
    }),
    spineNode({
      id: 'user:a.rodriguez',
      name: 'a.rodriguez',
      kind: EntityType.user,
      stage: 'lateral-movement',
      transition: 'spawned process docker',
    }),
  ],
  stages: [
    { stage: 'initial-access', label: 'Initial Access', nodeIds: ['host:docker-host-prod-01'] },
    { stage: 'lateral-movement', label: 'Lateral Movement', nodeIds: ['user:a.rodriguez'] },
  ],
  annotations: [],
  crownJewels: [],
  isSparse: false,
  ...over,
});

describe('layoutAttackPathGraph', () => {
  it('connects observed neighbors directly to the focus', () => {
    const { nodes, edges } = layoutAttackPathGraph(basePath());
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(['host:docker-host-prod-01', 'user:a.rodriguez'])
    );
    const spineEdges = edges.filter((e) => e.kind === 'spine');
    expect(spineEdges).toHaveLength(1);
    expect(spineEdges[0]).toMatchObject({
      source: 'host:docker-host-prod-01',
      target: 'user:a.rodriguez',
      label: 'spawned process docker',
    });
  });

  it('places neighbors in parallel without manufacturing a chain', () => {
    const { nodes } = layoutAttackPathGraph(
      basePath({
        spine: [
          spineNode({ id: 'a', name: 'a', stage: 'initial-access' }),
          spineNode({ id: 'b', name: 'b', stage: 'execution' }),
          spineNode({ id: 'c', name: 'c', stage: 'impact' }),
        ],
        stages: [],
      })
    );
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const a = byId.get('a');
    const b = byId.get('b');
    const c = byId.get('c');
    expect(a && b && c).toBeTruthy();
    expect(b!.position.x).toBeGreaterThan(a!.position.x);
    expect(c!.position.x).toBe(b!.position.x);
  });

  it('does not overlap sibling neighbors or the focus', () => {
    const { nodes } = layoutAttackPathGraph(
      basePath({
        spine: [
          spineNode({ id: 'a', name: 'a' }),
          spineNode({ id: 'b', name: 'b' }),
          spineNode({ id: 'c', name: 'c' }),
        ],
        stages: [],
      })
    );
    for (let left = 0; left < nodes.length; left++) {
      for (let right = left + 1; right < nodes.length; right++) {
        const a = nodes[left];
        const b = nodes[right];
        const separated =
          a.position.x + a.width <= b.position.x ||
          b.position.x + b.width <= a.position.x ||
          a.position.y + a.height <= b.position.y ||
          b.position.y + b.height <= a.position.y;
        expect(separated).toBe(true);
      }
    }
  });

  it('attaches grounded findings to their spine node (not as separate nodes)', () => {
    const { nodes } = layoutAttackPathGraph(
      basePath({
        annotations: [
          annotation({ id: 'a1', nodeId: 'host:docker-host-prod-01', text: 'Alert one' }),
          annotation({
            id: 'e1',
            nodeId: 'host:docker-host-prod-01',
            kind: 'activity',
            text: 'Did a thing',
          }),
        ],
      })
    );
    // No extra nodes are created for findings.
    expect(nodes).toHaveLength(2);
    const docker = nodes.find((n) => n.id === 'host:docker-host-prod-01');
    expect(docker && isEntityNodeData(docker.data)).toBe(true);
    if (docker && isEntityNodeData(docker.data)) {
      expect(docker.data.findings.map((f) => f.text)).toEqual(['Alert one', 'Did a thing']);
    }
  });

  it('branches crown-jewel leaves off their parent with branch edges and resource nodes', () => {
    const { nodes, edges } = layoutAttackPathGraph(
      basePath({
        crownJewels: [
          jewel({
            id: 'j1',
            nodeId: 'host:docker-host-prod-01',
            name: 'db-01',
            kind: 'data-store',
          }),
          jewel({
            id: 'j2',
            nodeId: 'user:a.rodriguez',
            name: '185.220.101.5',
            kind: 'exfil-destination',
          }),
        ],
      })
    );
    const resourceNodes = nodes.filter((n) => n.type === 'resource');
    expect(resourceNodes).toHaveLength(2);
    const branchEdges = edges.filter((e) => e.kind === 'branch');
    expect(branchEdges).toHaveLength(2);
    expect(branchEdges.map((e) => e.source)).toEqual(
      expect.arrayContaining(['host:docker-host-prod-01', 'user:a.rodriguez'])
    );
    // Leaves are positioned on a different rank than the spine (no overlap).
    const spineNodes = nodes.filter((n) => n.type !== 'resource');
    for (const leaf of resourceNodes) {
      const overlapsSpine = spineNodes.some(
        (s) =>
          leaf.position.x < s.position.x + s.width &&
          leaf.position.x + leaf.width > s.position.x &&
          leaf.position.y < s.position.y + s.height &&
          leaf.position.y + leaf.height > s.position.y
      );
      expect(overlapsSpine).toBe(false);
    }
  });

  it('marks the origin node with the origin type', () => {
    const { nodes } = layoutAttackPathGraph(
      basePath({
        spine: [
          spineNode({ id: 'origin', name: 'Internet', kind: 'origin', stage: undefined }),
          spineNode({ id: 'host:docker-host-prod-01', name: 'docker-host-prod-01' }),
        ],
        stages: [],
      })
    );
    expect(nodes.find((n) => n.id === 'origin')?.type).toBe('origin');
  });
  it('never links two neighbors merely because they sort next to each other', () => {
    const { edges } = layoutAttackPathGraph(
      basePath({
        spine: [
          spineNode({ id: 'focus', name: 'focus' }),
          spineNode({ id: 'neighbor-a', name: 'neighbor-a' }),
          spineNode({ id: 'neighbor-b', name: 'neighbor-b' }),
        ],
      })
    );
    expect(edges.map(({ source, target }) => [source, target])).toEqual([
      ['focus', 'neighbor-a'],
      ['focus', 'neighbor-b'],
    ]);
  });
});
