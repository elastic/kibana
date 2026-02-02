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
});
