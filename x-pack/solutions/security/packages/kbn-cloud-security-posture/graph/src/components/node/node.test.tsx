/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlow, Position } from '@xyflow/react';
import { TestProviders } from '../mock/test_providers';
import { DiamondNode } from './diamond_node';
import { EllipseNode } from './ellipse_node';
import { HexagonNode } from './hexagon_node';
import { PentagonNode } from './pentagon_node';
import { RectangleNode } from './rectangle_node';
import type { NodeProps, EntityNodeViewModel } from '../types';
import {
  GRAPH_NODE_EXPAND_BUTTON_ID,
  GRAPH_TAG_TEXT_ID,
  GRAPH_TAG_COUNT_ID,
  GRAPH_IPS_TEXT_ID,
  GRAPH_IPS_PLUS_COUNT_ID,
  GRAPH_ENTITY_NODE_DETAILS_ID,
  GRAPH_FLAGS_PLUS_COUNT_ID,
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_HOVER_SHAPE_ID,
  GRAPH_FLAGS_VISIBLE_FLAG_ID,
  GRAPH_ENTITY_NODE_BUTTON_ID,
  GRAPH_STACKED_SHAPE_ID,
} from '../test_ids';
import userEvent from '@testing-library/user-event';

// Turn off the optimization that hides elements that are not visible in the viewport
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

const nodeTypes = {
  diamond: DiamondNode,
  ellipse: EllipseNode,
  hexagon: HexagonNode,
  pentagon: PentagonNode,
  rectangle: RectangleNode,
};

const renderNodeInFlow = (nodeData: Partial<EntityNodeViewModel> = {}) => {
  const data: Omit<EntityNodeViewModel, 'id' | 'label'> = {
    color: 'primary' as const,
    shape: 'hexagon' as const,
    interactive: true,
    ...nodeData,
  };

  return render(
    <TestProviders>
      <ReactFlow
        fitView
        nodeTypes={nodeTypes}
        nodes={[
          {
            id: nodeData.id || 'test-node-id',
            type: nodeData.shape || 'hexagon',
            position: { x: 0, y: 0 },
            data,
          },
        ]}
        edges={[]}
      />
    </TestProviders>
  );
};

describe('Entity Nodes', () => {
  describe('Node Details', () => {
    it('should render node with no details', () => {
      renderNodeInFlow({});
      const nodeDetails = screen.getByTestId(GRAPH_ENTITY_NODE_DETAILS_ID);
      expect(nodeDetails).toBeInTheDocument();
      expect(nodeDetails).toBeEmptyDOMElement();
    });

    it('should handle count of 1 correctly (not shown)', () => {
      renderNodeInFlow({
        tag: 'Host',
        count: 1,
      });

      expect(screen.getByTestId(GRAPH_TAG_TEXT_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_TAG_COUNT_ID)).not.toBeInTheDocument();
    });

    it('should handle zero count correctly', () => {
      renderNodeInFlow({
        tag: 'Host',
        count: 0,
      });

      expect(screen.getByTestId(GRAPH_TAG_TEXT_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_TAG_COUNT_ID)).not.toBeInTheDocument();
    });

    it('should render N/A with undefined tag and count > 1', () => {
      renderNodeInFlow({
        count: 3,
        tag: undefined,
      });

      expect(screen.getByTestId(GRAPH_TAG_TEXT_ID).textContent).toBe('N/A');
    });

    it('should render node with all details (count > 1)', () => {
      const label = 'server-01';
      const tag = 'Host';
      const count = 3;
      renderNodeInFlow({
        tag,
        count,
        label,
        ips: ['192.168.1.1', '10.0.0.1'],
        countryCodes: ['us', 'fr', 'es'],
      });

      expect(screen.getByTestId(GRAPH_TAG_TEXT_ID).textContent).toBe(tag);
      expect(screen.getByTestId(GRAPH_TAG_COUNT_ID).textContent).toBe(count.toString());
      expect(screen.getByText('server-01').textContent).toBe(label);
      expect(screen.getByTestId(GRAPH_IPS_TEXT_ID).textContent).toBe('IP: ');
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID).textContent).toBe('+1');
      expect(screen.getAllByTestId(GRAPH_FLAGS_VISIBLE_FLAG_ID)).toHaveLength(2);
      expect(screen.getByTestId(GRAPH_FLAGS_PLUS_COUNT_ID).textContent).toBe('+1');
    });

    it('should render node with many IPs', () => {
      const manyIps = Array.from({ length: 10 }, (_, i) => `192.168.1.${i + 1}`);
      renderNodeInFlow({ ips: manyIps });

      expect(screen.getByTestId(GRAPH_IPS_TEXT_ID).textContent).toBe('IP: ');
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID).textContent).toBe(
        `+${manyIps.length - 1}`
      );
    });

    it('should render node with many country codes', () => {
      const manyCodes = ['us', 'fr', 'es', 'de', 'jp', 'au', 'ca'];
      renderNodeInFlow({ countryCodes: manyCodes });

      expect(screen.getAllByTestId(GRAPH_FLAGS_VISIBLE_FLAG_ID)).toHaveLength(2);
      expect(screen.getByTestId(GRAPH_FLAGS_PLUS_COUNT_ID).textContent).toBe(
        `+${manyCodes.length - 2}`
      );
    });
  });

  describe('Interactive Features', () => {
    it('should render expand button when interactive', () => {
      renderNodeInFlow({ interactive: true });

      const expandButton = screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID);
      expect(expandButton).toBeInTheDocument();
    });

    it('should not render expand button when not interactive', () => {
      renderNodeInFlow({ interactive: false });

      const expandButton = screen.queryByTestId(GRAPH_NODE_EXPAND_BUTTON_ID);
      expect(expandButton).not.toBeInTheDocument();
    });

    it('should call expandButtonClick when expand button is clicked', () => {
      const mockExpandButtonClick = jest.fn();
      renderNodeInFlow({
        interactive: true,
        expandButtonClick: mockExpandButtonClick,
      });

      const expandButton = screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID);
      fireEvent.click(expandButton);

      expect(mockExpandButtonClick).toHaveBeenCalledTimes(1);
    });

    it('should call nodeClick when node is clicked', () => {
      const mockNodeClick = jest.fn();
      renderNodeInFlow({
        interactive: true,
        nodeClick: mockNodeClick,
      });

      const nodeButton = screen.getByTestId(GRAPH_ENTITY_NODE_BUTTON_ID);
      fireEvent.click(nodeButton);

      expect(mockNodeClick).toHaveBeenCalledTimes(1);
    });

    it('should render hover shape when interactive', async () => {
      renderNodeInFlow({ interactive: true });

      userEvent.hover(screen.getByTestId(GRAPH_ENTITY_NODE_ID));

      await waitFor(async () => {
        const shapeOnHover = screen.queryByTestId(GRAPH_ENTITY_NODE_HOVER_SHAPE_ID);
        expect(shapeOnHover).toBeInTheDocument();
      });
    });

    it('should not render hover shape when not interactive', async () => {
      renderNodeInFlow({ interactive: false });

      userEvent.hover(screen.getByTestId(GRAPH_ENTITY_NODE_ID));

      await waitFor(async () => {
        const shapeOnHover = screen.queryByTestId(GRAPH_ENTITY_NODE_HOVER_SHAPE_ID);
        expect(shapeOnHover).not.toBeInTheDocument();
      });
    });
  });

  describe('Node Handles', () => {
    it('should render input and output handles', () => {
      const { container } = renderNodeInFlow({});

      // Check for React Flow handles
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles).toHaveLength(2); // input and output handles
    });

    it('should have correct handle positions', () => {
      const { container } = renderNodeInFlow({});

      const leftHandle = container.querySelector('.react-flow__handle.react-flow__handle-left');
      const rightHandle = container.querySelector('.react-flow__handle.react-flow__handle-right');

      expect(leftHandle).toBeInTheDocument();
      expect(rightHandle).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = renderNodeInFlow({ interactive: true });

      const nodeContainer = container.querySelector('.react-flow__node');
      expect(nodeContainer).toBeInTheDocument();

      // Check for focusable elements
      const expandButton = screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID);
      expect(expandButton).toHaveAttribute('type', 'button');
    });
  });

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
});
