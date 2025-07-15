/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiMessageCode } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { parseRecords } from './parse_records';
import type { GraphEdge } from './types';

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
} as any;

describe('parseRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty nodes and edges for empty input', () => {
    const result = parseRecords(mockLogger, []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.messages).toBeUndefined();
  });

  it('creates nodes and edges for a single actor-target-action', () => {
    const records: GraphEdge[] = [
      {
        action: 'login',
        actorIds: 'actor1',
        badge: 1,
        docs: ['{"foo":"bar"}'],
        isOrigin: true,
        isOriginAlert: false,
        targetIds: 'target1',
      },
    ];
    const result = parseRecords(mockLogger, records);

    // Should have 3 nodes: actor, target, label
    expect(result.nodes.length).toBe(3);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('actor1');
    expect(ids).toContain('target1');
    expect(ids.some((id) => id.includes('label(login)'))).toBe(true);

    // Should have 2 edges: actor->label, label->target
    expect(result.edges.length).toBe(2);
    expect(result.edges[0].source).toBe('actor1');
    expect(result.edges[0].target).toContain('label(login)');
    expect(result.edges[1].source).toContain('label(login)');
    expect(result.edges[1].target).toBe('target1');

    // Label node should have correct label and documentsData
    const labelNode = result.nodes.find((n) => n.id.includes('label(login)'));
    expect(labelNode).toBeDefined();
    expect(labelNode!.label).toBe('login');
    expect(labelNode).toHaveProperty('documentsData', [{ foo: 'bar' }]);
    expect(labelNode).toHaveProperty('color', 'primary');
    expect(labelNode!.shape).toBe('label');
  });

  it('handles docs as a single string', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: 'actor1',
        badge: 1,
        docs: '{"a":1}',
        isOrigin: true,
        isOriginAlert: false,
        targetIds: 'target1',
      },
    ];
    const result = parseRecords(mockLogger, records);
    const labelNode = result.nodes.find((n) => n.id.includes('label(foo)'));
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('documentsData', [{ a: 1 }]);
  });

  it('creates group node when multiple actions between same actor and target', () => {
    const records: GraphEdge[] = [
      {
        action: 'login',
        actorIds: 'actor1',
        badge: 1,
        docs: ['{"foo":"bar"}'],
        isOrigin: true,
        isOriginAlert: false,
        targetIds: 'target1',
      },
      {
        action: 'logout',
        actorIds: 'actor1',
        badge: 1,
        docs: ['{"baz":2}'],
        isOrigin: true,
        isOriginAlert: false,
        targetIds: 'target1',
      },
    ];
    const result = parseRecords(mockLogger, records);

    // Should have a group node
    const groupNode = result.nodes.find((n) => n.shape === 'group');
    expect(groupNode).toBeDefined();
    expect(groupNode!.id).toContain('grp(');

    // Group node should be first
    expect(result.nodes[0].shape).toBe('group');

    // Each label node should have parentId set to group node id
    const labelNodes = result.nodes.filter((n) => n.shape === 'label');
    labelNodes.forEach((ln) => {
      expect((ln as any).parentId).toBe(groupNode!.id);
    });

    // Edges should connect actor->group, group->label, label->target
    const actorToGroupEdge = result.edges.find(
      (edge) => edge.source === 'actor1' && edge.target === groupNode!.id
    );
    expect(actorToGroupEdge).toBeDefined();

    labelNodes.forEach((labelNode) => {
      const groupToLabelEdge = result.edges.find(
        (edge) => edge.source === groupNode!.id && edge.target === labelNode.id
      );
      expect(groupToLabelEdge).toBeDefined();

      const labelToGroupEdge = result.edges.find(
        (edge) => edge.source === labelNode.id && edge.target === groupNode!.id
      );
      expect(labelToGroupEdge).toBeDefined();
    });

    const targetToGroupEdge = result.edges.find(
      (edge) => edge.source === groupNode!.id && edge.target === 'target1'
    );
    expect(targetToGroupEdge).toBeDefined();
  });

  it('sets color to danger for isOriginAlert', () => {
    const records: GraphEdge[] = [
      {
        actorIds: 'actor1',
        targetIds: 'target1',
        action: 'alert',
        docs: ['{"foo":"bar"}'],
        badge: 1,
        isOrigin: true,
        isOriginAlert: true,
      },
    ];
    const result = parseRecords(mockLogger, records);
    const labelNode = result.nodes.find((n) => n.id.includes('label(alert)'));
    expect(labelNode).toBeDefined();
    expect(labelNode).toHaveProperty('color', 'danger');
  });

  it('handles unknown target ids', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: 'actor1',
        badge: 1,
        docs: ['{"foo":"bar"}'],
        hosts: [],
        ips: [],
        isOrigin: true,
        isOriginAlert: false,
        targetIds: [null, 'target1'],
        users: [],
      },
    ];
    const result = parseRecords(mockLogger, records);
    // Should create a node with label 'Unknown'
    const unknownNode = result.nodes.find((n) => n.label === 'Unknown');
    expect(unknownNode).toBeDefined();
    expect(unknownNode!.id.startsWith('unknown')).toBe(true);
  });

  it('limits nodes and sets message when nodesLimit is reached', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: ['a1', 'a2'],
        badge: 1,
        docs: ['{"foo":"bar"}'],
        isOrigin: true,
        isOriginAlert: false,
        targetIds: ['t1'],
      },
      {
        action: 'foo2',
        actorIds: ['a3'],
        badge: 1,
        docs: ['{"foo":"bar"}'],
        isOrigin: true,
        isOriginAlert: false,
        targetIds: ['t2', 't3'],
      },
    ];
    // nodesLimit = 2, so only 2 nodes should be created
    // However, first record creates 5 nodes (2 actors, 1 target, 1 label, 1 group)
    // Since we process records as a whole, so the graph won't look broken we expect the length to be 5
    const result = parseRecords(mockLogger, records, 2);
    expect(result.nodes.length).toBeLessThanOrEqual(5);
    expect(result.messages).toContain(ApiMessageCode.ReachedNodesLimit);
  });

  it('assigns correct shapes and icons for entity nodes', () => {
    const records: GraphEdge[] = [
      {
        action: 'foo',
        actorIds: ['user1', 'host1', 'ip1'],
        badge: 1,
        docs: ['{"foo":"bar"}'],
        hosts: ['host1'],
        ips: ['ip1'],
        isOrigin: true,
        isOriginAlert: false,
        targetIds: [],
        users: ['user1'],
      },
    ];
    const result = parseRecords(mockLogger, records);

    const userNode = result.nodes.find((n) => n.id === 'user1');
    expect(userNode).toMatchObject({ 
      shape: 'ellipse', 
      icon: 'user',
      entityType: 'user',
      secondaryLabel: 'Detail information +99'
    });
    expect(userNode).toHaveProperty('flagBadges');
    expect(Array.isArray(userNode?.flagBadges)).toBe(true);
    // entityCount is optional and may or may not be present
    if ('entityCount' in userNode!) {
      expect(typeof userNode.entityCount).toBe('number');
    }

    const hostNode = result.nodes.find((n) => n.id === 'host1');
    expect(hostNode).toMatchObject({ 
      shape: 'hexagon', 
      icon: 'storage',
      entityType: 'host'
    });
    expect(hostNode).toHaveProperty('flagBadges');
    expect(Array.isArray(hostNode?.flagBadges)).toBe(true);
    // Host should have IP information in secondaryLabel
    expect(hostNode?.secondaryLabel).toMatch(/IP:/);
    // entityCount is optional and may or may not be present
    if ('entityCount' in hostNode!) {
      expect(typeof hostNode.entityCount).toBe('number');
    }

    const ipNode = result.nodes.find((n) => n.id === 'ip1');
    expect(ipNode).toMatchObject({ 
      shape: 'diamond', 
      icon: 'globe',
      entityType: 'other',
      secondaryLabel: 'Detail information +99'
    });
    expect(ipNode).toHaveProperty('flagBadges');
    expect(Array.isArray(ipNode?.flagBadges)).toBe(true);
    // entityCount is optional and may or may not be present
    if ('entityCount' in ipNode!) {
      expect(typeof ipNode.entityCount).toBe('number');
    }
  });
});
