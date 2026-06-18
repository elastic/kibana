/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeViewModel, EdgeViewModel } from '../types';
import { layoutGraph } from './layout_graph';

describe('layoutGraph', () => {
  describe('fan-out scenario (one label → multiple targets)', () => {
    it('should position multiple target nodes at distinct Y coordinates when connected to a single label node', () => {
      // Graph structure: Actor → Label → Target1
      //                              └─→ Target2
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'actor',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'actor',
            label: 'Actor',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
        },
        {
          id: 'label',
          type: 'label',
          position: { x: 0, y: 0 },
          data: {
            id: 'label',
            label: 'Action',
            color: 'primary',
            shape: 'label',
          },
        },
        {
          id: 'target1',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target1',
            label: 'Target 1',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
        {
          id: 'target2',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target2',
            label: 'Target 2',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        {
          id: 'actor-label',
          source: 'actor',
          target: 'label',
        },
        {
          id: 'label-target1',
          source: 'label',
          target: 'target1',
        },
        {
          id: 'label-target2',
          source: 'label',
          target: 'target2',
        },
      ];

      const result = layoutGraph(nodes, edges);

      // Find the target nodes in the result
      const target1 = result.nodes.find((n) => n.id === 'target1');
      const target2 = result.nodes.find((n) => n.id === 'target2');

      expect(target1).toBeDefined();
      expect(target2).toBeDefined();

      // Target nodes should have different Y coordinates (not overlapping)
      expect(target1!.position.y).not.toBe(target2!.position.y);
    });

    it('should position three target nodes at distinct Y coordinates when connected to a single label node', () => {
      // Graph structure: Actor → Label → Target1
      //                              ├─→ Target2
      //                              └─→ Target3
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'actor',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'actor',
            label: 'Actor',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
        },
        {
          id: 'label',
          type: 'label',
          position: { x: 0, y: 0 },
          data: {
            id: 'label',
            label: 'Action',
            color: 'primary',
            shape: 'label',
          },
        },
        {
          id: 'target1',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target1',
            label: 'Target 1',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
        {
          id: 'target2',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target2',
            label: 'Target 2',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
        {
          id: 'target3',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target3',
            label: 'Target 3',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        {
          id: 'actor-label',
          source: 'actor',
          target: 'label',
        },
        {
          id: 'label-target1',
          source: 'label',
          target: 'target1',
        },
        {
          id: 'label-target2',
          source: 'label',
          target: 'target2',
        },
        {
          id: 'label-target3',
          source: 'label',
          target: 'target3',
        },
      ];

      const result = layoutGraph(nodes, edges);

      // Find the target nodes in the result
      const target1 = result.nodes.find((n) => n.id === 'target1');
      const target2 = result.nodes.find((n) => n.id === 'target2');
      const target3 = result.nodes.find((n) => n.id === 'target3');

      expect(target1).toBeDefined();
      expect(target2).toBeDefined();
      expect(target3).toBeDefined();

      // All target nodes should have different Y coordinates
      const yPositions = [target1!.position.y, target2!.position.y, target3!.position.y];
      const uniqueYPositions = new Set(yPositions);
      expect(uniqueYPositions.size).toBe(3);
    });

    it('should still center single child on parent when there are no siblings', () => {
      // Graph structure: Actor → Label → Target (single target, should center on label)
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'actor',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'actor',
            label: 'Actor',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
        },
        {
          id: 'label',
          type: 'label',
          position: { x: 0, y: 0 },
          data: {
            id: 'label',
            label: 'Action',
            color: 'primary',
            shape: 'label',
          },
        },
        {
          id: 'target',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target',
            label: 'Target',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        {
          id: 'actor-label',
          source: 'actor',
          target: 'label',
        },
        {
          id: 'label-target',
          source: 'label',
          target: 'target',
        },
      ];

      const result = layoutGraph(nodes, edges);

      // Find the nodes in the result
      const label = result.nodes.find((n) => n.id === 'label');
      const target = result.nodes.find((n) => n.id === 'target');

      expect(label).toBeDefined();
      expect(target).toBeDefined();

      // The layout should complete without errors and nodes should have positions
      expect(typeof target!.position.x).toBe('number');
      expect(typeof target!.position.y).toBe('number');
    });
  });

  describe('mixed label and relationship nodes', () => {
    it('should position label and relationship nodes at distinct coordinates', () => {
      // Graph structure: Actor → RelationshipNode → Target1
      //                       → LabelNode         → Target2
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'actor',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'actor',
            label: 'Actor',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
        },
        {
          id: 'rel',
          type: 'relationship',
          position: { x: 0, y: 0 },
          data: {
            id: 'rel',
            label: 'Owns',
            shape: 'relationship',
          },
        },
        {
          id: 'label',
          type: 'label',
          position: { x: 0, y: 0 },
          data: {
            id: 'label',
            label: 'Action',
            color: 'primary',
            shape: 'label',
          },
        },
        {
          id: 'target1',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target1',
            label: 'Target 1',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
        {
          id: 'target2',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'target2',
            label: 'Target 2',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        { id: 'actor-rel', source: 'actor', target: 'rel' },
        { id: 'actor-label', source: 'actor', target: 'label' },
        { id: 'rel-target1', source: 'rel', target: 'target1' },
        { id: 'label-target2', source: 'label', target: 'target2' },
      ];

      const result = layoutGraph(nodes, edges);

      const relNode = result.nodes.find((n) => n.id === 'rel');
      const labelNode = result.nodes.find((n) => n.id === 'label');
      const target1 = result.nodes.find((n) => n.id === 'target1');
      const target2 = result.nodes.find((n) => n.id === 'target2');

      expect(relNode).toBeDefined();
      expect(labelNode).toBeDefined();
      expect(target1).toBeDefined();
      expect(target2).toBeDefined();

      // Relationship and label nodes should not overlap
      expect(relNode!.position.y).not.toBe(labelNode!.position.y);

      // Target nodes should have different Y coordinates
      expect(target1!.position.y).not.toBe(target2!.position.y);
    });

    it('should layout relationship node connected between two entity nodes', () => {
      // Graph structure: Entity1 → Relationship → Entity2
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'entity1',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'entity1',
            label: 'Entity 1',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
        },
        {
          id: 'rel',
          type: 'relationship',
          position: { x: 0, y: 0 },
          data: {
            id: 'rel',
            label: 'Depends on',
            shape: 'relationship',
          },
        },
        {
          id: 'entity2',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'entity2',
            label: 'Entity 2',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        { id: 'e1-rel', source: 'entity1', target: 'rel' },
        { id: 'rel-e2', source: 'rel', target: 'entity2' },
      ];

      const result = layoutGraph(nodes, edges);

      const entity1 = result.nodes.find((n) => n.id === 'entity1');
      const relNode = result.nodes.find((n) => n.id === 'rel');
      const entity2 = result.nodes.find((n) => n.id === 'entity2');

      expect(entity1).toBeDefined();
      expect(relNode).toBeDefined();
      expect(entity2).toBeDefined();

      // Nodes should be laid out left-to-right (increasing X)
      expect(relNode!.position.x).toBeGreaterThan(entity1!.position.x);
      expect(entity2!.position.x).toBeGreaterThan(relNode!.position.x);
    });
  });

  describe('cyclic graphs', () => {
    it('should not throw and should position all nodes for an actor===target self-loop reachable from a sink', () => {
      // Reproduces the CycleException scenario: an event whose actor and target resolve to the
      // same entity (self-loop entity <-> label), plus a resolution relationship that introduces
      // a sink. Traversing predecessors from the sink reaches the self-loop.
      //
      //   label <-> user:1049@auditd -> rel(...resolved_to) -> user:...@local (sink)
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'user:1049@auditd',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'user:1049@auditd',
            label: 'chaison_griffin',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
        },
        {
          id: 'label(modified-user-account)',
          type: 'label',
          position: { x: 0, y: 0 },
          data: {
            id: 'label(modified-user-account)',
            label: 'modified-user-account',
            color: 'primary',
            shape: 'label',
          },
        },
        {
          id: 'rel(user:1049@auditd-resolution.resolved_to)',
          type: 'relationship',
          position: { x: 0, y: 0 },
          data: {
            id: 'rel(user:1049@auditd-resolution.resolved_to)',
            label: 'Resolved to',
            shape: 'relationship',
          },
        },
        {
          id: 'user:chaison_griffin@host@local',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            id: 'user:chaison_griffin@host@local',
            label: 'chaison_griffin@host',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        // Self-loop: actor and target are the same entity
        {
          id: 'user-label',
          source: 'user:1049@auditd',
          target: 'label(modified-user-account)',
        },
        {
          id: 'label-user',
          source: 'label(modified-user-account)',
          target: 'user:1049@auditd',
        },
        // Resolution relationship introduces a sink reachable from the self-loop
        {
          id: 'user-rel',
          source: 'user:1049@auditd',
          target: 'rel(user:1049@auditd-resolution.resolved_to)',
        },
        {
          id: 'rel-local',
          source: 'rel(user:1049@auditd-resolution.resolved_to)',
          target: 'user:chaison_griffin@host@local',
        },
      ];

      let result: ReturnType<typeof layoutGraph> | undefined;
      expect(() => {
        result = layoutGraph(nodes, edges);
      }).not.toThrow();

      // Every input node should be present with numeric positions
      expect(result!.nodes).toHaveLength(nodes.length);
      result!.nodes.forEach((node) => {
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });
    });
  });
});
