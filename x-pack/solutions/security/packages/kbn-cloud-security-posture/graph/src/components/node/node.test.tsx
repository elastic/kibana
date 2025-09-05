/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlow, Position } from '@xyflow/react';
import { DiamondNode } from './diamond_node';
import { EllipseNode } from './ellipse_node';
import { HexagonNode } from './hexagon_node';
import { PentagonNode } from './pentagon_node';
import { RectangleNode } from './rectangle_node';
import type { NodeProps, EntityNodeViewModel } from '../types';
import { GRAPH_ENTITY_NODE_ID, GRAPH_STACKED_SHAPE_ID } from '../test_ids';

describe('Stacked Shapes', () => {
  const createNodeProps = (shape: string, count?: number, color?: string): NodeProps => ({
    id: `test-${shape}-node`,
    data: {
      id: `test-${shape}-node`,
      label: `Test ${shape}`,
      color: color || 'primary',
      shape,
      interactive: true,
      count,
    } as EntityNodeViewModel,
    type: shape,
    selected: false,
    dragging: false,
    dragHandle: '',
    targetPosition: Position.Left,
    sourcePosition: Position.Right,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    width: 100,
    height: 100,
    zIndex: 1,
    isConnectable: false,
    selectable: true,
    deletable: true,
    draggable: true,
  });

  const nodeComponents = [
    { shape: 'diamond', component: DiamondNode },
    { shape: 'ellipse', component: EllipseNode },
    { shape: 'hexagon', component: HexagonNode },
    { shape: 'pentagon', component: PentagonNode },
    { shape: 'rectangle', component: RectangleNode },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each(nodeComponents)(
    '$shape node stacked shapes',
    ({ shape, component: NodeComponent }) => {
      describe('renders stacked shapes when count > 1', () => {
        it.each([2, 1000])('shows 2 stacked shapes when count is %d', (count) => {
          const props = createNodeProps(shape, count);

          render(
            <ReactFlow>
              <NodeComponent {...props} />
            </ReactFlow>
          );

          // regular shape is rendered
          expect(screen.getByTestId(GRAPH_ENTITY_NODE_ID)).toBeInTheDocument();

          // stacked shapes also rendered
          const stackedShapes = screen.getAllByTestId(GRAPH_STACKED_SHAPE_ID);
          expect(stackedShapes).toHaveLength(2);
        });
      });

      describe('does not render stacked shapes when count <= 1', () => {
        it.each([
          { count: 1, description: 'count is 1' },
          { count: 0, description: 'count is 0' },
          { count: -1, description: 'count is negative' },
          { count: undefined, description: 'count is undefined' },
        ])('hides stacked shapes when $description', ({ count }) => {
          const props = createNodeProps(shape, count);

          render(
            <ReactFlow>
              <NodeComponent {...props} />
            </ReactFlow>
          );

          // regular shape is rendered
          expect(screen.getByTestId(GRAPH_ENTITY_NODE_ID)).toBeInTheDocument();

          // stacked shapes not rendered
          const stackedShapes = screen.queryAllByTestId(GRAPH_STACKED_SHAPE_ID);
          expect(stackedShapes).toHaveLength(0);
        });
      });

      describe('color consistency', () => {
        it.each([{ color: 'primary' }, { color: 'danger' }])(
          'stacked shapes match $color color',
          ({ color }) => {
            const props = createNodeProps(shape, 3, color);

            render(
              <ReactFlow>
                <NodeComponent {...props} />
              </ReactFlow>
            );

            const regularShape = screen.getByTestId(GRAPH_ENTITY_NODE_ID);
            const stackedShapes = screen.getAllByTestId(GRAPH_STACKED_SHAPE_ID);
            const allShapes = [regularShape, ...stackedShapes];

            // Get all shape elements (paths, circles, rects depending on shape type)
            const shapeElements = allShapes.flatMap((sh) =>
              Array.from(sh.querySelectorAll('path, circle, rect'))
            );
            const fillColors = shapeElements.map((el) => el.getAttribute('fill')).filter(Boolean);

            // All shapes should have the same fill color
            const uniqueColors = Array.from(new Set(fillColors));
            expect(uniqueColors).toHaveLength(1);
          }
        );
      });
    }
  );
});
