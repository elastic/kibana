/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeViewModel, EdgeViewModel } from '../types';
import { layoutGraph } from './layout_graph';
import { collectOriginSpineNodeIds, getLayoutNodeCenterY } from './layout_origin_spine';

const getCenterY = getLayoutNodeCenterY;

describe('layout_origin_spine', () => {
  describe('collectOriginSpineNodeIds', () => {
    it('includes origin connectors and groups but not expanded entities', () => {
      const nodesById = {
        origin: {
          id: 'origin',
          data: {
            id: 'origin',
            shape: 'ellipse',
            color: 'primary',
            isOrigin: true,
          },
        },
        group: {
          id: 'group',
          data: { id: 'group', shape: 'group' },
        },
        originEvent: {
          id: 'originEvent',
          data: {
            id: 'originEvent',
            shape: 'label',
            color: 'primary',
            isOrigin: true,
          },
        },
        expanded: {
          id: 'expanded',
          data: {
            id: 'expanded',
            shape: 'hexagon',
            color: 'primary',
          },
        },
      } as Record<string, Node<NodeViewModel>>;

      const spine = collectOriginSpineNodeIds(
        nodesById,
        [
          { source: 'origin', target: 'group' },
          { source: 'group', target: 'originEvent' },
          { source: 'origin', target: 'expanded' },
        ],
        new Set()
      );

      expect([...spine].sort()).toEqual(['group', 'origin', 'originEvent'].sort());
    });
  });

  describe('layoutGraph origin spine alignment', () => {
    it('aligns origin investigation nodes on a shared horizontal spine', () => {
      const nodes: Array<Node<NodeViewModel>> = [
        {
          id: 'originEntity',
          type: 'ellipse',
          position: { x: 0, y: 0 },
          data: {
            id: 'originEntity',
            label: 'Origin',
            color: 'primary',
            shape: 'ellipse',
            isOrigin: true,
          },
        },
        {
          id: 'originRel',
          type: 'relationship',
          position: { x: 0, y: 0 },
          data: {
            id: 'originRel',
            label: 'Owns',
            shape: 'relationship',
            isOrigin: true,
          },
        },
        {
          id: 'originEvent',
          type: 'label',
          position: { x: 0, y: 0 },
          data: {
            id: 'originEvent',
            label: 'Sign-in',
            color: 'primary',
            shape: 'label',
            isOrigin: true,
          },
        },
        {
          id: 'expandedEntity',
          type: 'hexagon',
          position: { x: 0, y: 0 },
          data: {
            id: 'expandedEntity',
            label: 'Expanded',
            color: 'primary',
            shape: 'hexagon',
          },
        },
      ];

      const edges: Array<Edge<EdgeViewModel>> = [
        { id: 'e1', source: 'originEntity', target: 'originRel' },
        { id: 'e2', source: 'originRel', target: 'originEvent' },
        { id: 'e3', source: 'originEntity', target: 'expandedEntity' },
      ];

      const result = layoutGraph(nodes, edges);

      const originEntity = result.nodes.find((node) => node.id === 'originEntity');
      const originRel = result.nodes.find((node) => node.id === 'originRel');
      const originEvent = result.nodes.find((node) => node.id === 'originEvent');
      const expandedEntity = result.nodes.find((node) => node.id === 'expandedEntity');

      expect(originEntity).toBeDefined();
      expect(originRel).toBeDefined();
      expect(originEvent).toBeDefined();
      expect(expandedEntity).toBeDefined();

      const spineCenterYs = [
        getCenterY(originEntity!),
        getCenterY(originRel!),
        getCenterY(originEvent!),
      ];

      expect(new Set(spineCenterYs).size).toBe(1);
      expect(getCenterY(expandedEntity!)).not.toBe(spineCenterYs[0]);
    });
  });
});
