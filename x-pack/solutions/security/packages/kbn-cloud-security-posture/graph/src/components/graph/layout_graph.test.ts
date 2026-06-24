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

  describe('cyclic graphs (must not throw)', () => {
    it('lays out a self-referential cycle without throwing', () => {
      // `A` is both the source and the target of action `L` (e.g. a user that
      // logs itself on/off), so `A → L` and `L → A` form a cycle. `A` also fans
      // out to a leaf `C`, which makes the cycle reachable from a sink during
      // the alignment topological sort — the exact shape that used to throw
      // `CycleException` and abort the entire graph render.
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'A',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: { id: 'A', label: 'Actor', color: 'primary', shape: 'ellipse', icon: 'user' },
        },
        {
          id: 'L',
          type: 'label',
          position: { x: 0, y: 0 },
          data: { id: 'L', label: 'logon', color: 'primary', shape: 'label' },
        },
        {
          id: 'C',
          type: 'entity',
          position: { x: 0, y: 0 },
          data: { id: 'C', label: 'Leaf', color: 'primary', shape: 'hexagon', icon: 'storage' },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        { id: 'A-L', source: 'A', target: 'L' },
        { id: 'L-A', source: 'L', target: 'A' },
        { id: 'A-C', source: 'A', target: 'C' },
      ];

      expect(() => layoutGraph(nodes, edges)).not.toThrow();

      const result = layoutGraph(nodes, edges);
      expect(result.nodes).toHaveLength(3);
      result.nodes.forEach((node) => {
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
      });
    });

    it('lays out bidirectional entity↔group edges without throwing', () => {
      // Mirrors the real payload that crashed: a group of stacked actions
      // (logon/logoff) whose actor entity is also their target, producing both
      // `entity → group` and `group → entity` edges. The entity also fans out to
      // a labelled action that reaches a leaf, so the cycle is reachable from a
      // sink during the alignment pass.
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'entity',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          data: { id: 'entity', label: 'user', color: 'primary', shape: 'rectangle', icon: 'user' },
        },
        {
          id: 'grp',
          type: 'group',
          position: { x: 0, y: 0 },
          data: { id: 'grp', shape: 'group' },
        },
        {
          id: 'logon',
          type: 'label',
          position: { x: 0, y: 0 },
          parentId: 'grp',
          data: { id: 'logon', label: 'logon', color: 'primary', shape: 'label', parentId: 'grp' },
        },
        {
          id: 'logoff',
          type: 'label',
          position: { x: 0, y: 0 },
          parentId: 'grp',
          data: { id: 'logoff', label: 'logoff', color: 'primary', shape: 'label', parentId: 'grp' },
        },
        {
          id: 'access',
          type: 'label',
          position: { x: 0, y: 0 },
          data: { id: 'access', label: 'access', color: 'primary', shape: 'label' },
        },
        {
          id: 'leaf',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          data: {
            id: 'leaf',
            label: 'Target',
            color: 'primary',
            shape: 'rectangle',
            icon: 'storage',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        { id: 'grp-entity', source: 'grp', target: 'entity' },
        { id: 'entity-grp', source: 'entity', target: 'grp' },
        { id: 'grp-logon', source: 'grp', target: 'logon' },
        { id: 'grp-logoff', source: 'grp', target: 'logoff' },
        { id: 'logon-grp', source: 'logon', target: 'grp' },
        { id: 'logoff-grp', source: 'logoff', target: 'grp' },
        { id: 'entity-access', source: 'entity', target: 'access' },
        { id: 'access-leaf', source: 'access', target: 'leaf' },
      ];

      expect(() => layoutGraph(nodes, edges)).not.toThrow();

      const result = layoutGraph(nodes, edges);
      const entity = result.nodes.find((n) => n.id === 'entity');
      const grp = result.nodes.find((n) => n.id === 'grp');
      const leaf = result.nodes.find((n) => n.id === 'leaf');

      expect(entity).toBeDefined();
      expect(grp).toBeDefined();
      expect(leaf).toBeDefined();
      [entity, grp, leaf].forEach((node) => {
        expect(Number.isFinite(node!.position.x)).toBe(true);
        expect(Number.isFinite(node!.position.y)).toBe(true);
      });
    });
  });
});
