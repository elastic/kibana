/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  GRAPH_ENTITY_NODE_ID,
  GRAPH_ENTITY_NODE_BUTTON_ID,
  GRAPH_ENTITY_NODE_RISK_BADGE_ID,
  GRAPH_ENTITY_NODE_LAYERS_PANEL_ID,
  GRAPH_STACKED_SHAPE_ID,
} from '../test_ids';

// Turn off the optimization that hides elements that are not visible in the viewport
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

// Control zoom level for "with layers on" tests
const mockViewport = { zoom: 1, x: 0, y: 0 };
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useViewport: () => mockViewport,
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
  describe('Card Content', () => {
    it('should render the node container', () => {
      renderNodeInFlow({});
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_ID)).toBeInTheDocument();
    });

    it('should render entity name (label)', () => {
      renderNodeInFlow({ label: 'macbook-john-work' });
      expect(screen.getByText('macbook-john-work')).toBeInTheDocument();
    });

    it('should render entity type (tag) as subtitle', () => {
      renderNodeInFlow({ label: 'server-01', tag: 'Host' });
      expect(screen.getByText('server-01')).toBeInTheDocument();
      expect(screen.getByText('Host')).toBeInTheDocument();
    });

    it('should not render tag subtitle when tag is absent', () => {
      renderNodeInFlow({ label: 'server-01', tag: undefined });
      expect(screen.getByText('server-01')).toBeInTheDocument();
      expect(screen.queryByText('Host')).not.toBeInTheDocument();
    });

    it('should render risk badge with N/A placeholder', () => {
      renderNodeInFlow({});
      const badge = screen.getByTestId(GRAPH_ENTITY_NODE_RISK_BADGE_ID);
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('N/A');
    });
  });

  describe('Interactive Features', () => {
    it('should render expand button when interactive', () => {
      renderNodeInFlow({ interactive: true });
      expect(screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID)).toBeInTheDocument();
    });

    it('should not render expand button when not interactive', () => {
      renderNodeInFlow({ interactive: false });
      expect(screen.queryByTestId(GRAPH_NODE_EXPAND_BUTTON_ID)).not.toBeInTheDocument();
    });

    it('should call expandButtonClick when expand button is clicked', () => {
      const mockExpandButtonClick = jest.fn();
      renderNodeInFlow({ interactive: true, expandButtonClick: mockExpandButtonClick });

      fireEvent.click(screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID));
      expect(mockExpandButtonClick).toHaveBeenCalledTimes(1);
    });

    it('should call nodeClick when node button is clicked', () => {
      const mockNodeClick = jest.fn();
      renderNodeInFlow({ interactive: true, nodeClick: mockNodeClick });

      fireEvent.click(screen.getByTestId(GRAPH_ENTITY_NODE_BUTTON_ID));
      expect(mockNodeClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Node Handles', () => {
    it('should render input and output handles', () => {
      const { container } = renderNodeInFlow({});
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles).toHaveLength(2);
    });

    it('should have correct handle positions', () => {
      const { container } = renderNodeInFlow({});
      expect(
        container.querySelector('.react-flow__handle.react-flow__handle-left')
      ).toBeInTheDocument();
      expect(
        container.querySelector('.react-flow__handle.react-flow__handle-right')
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on expand button', () => {
      renderNodeInFlow({ interactive: true });
      expect(screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID)).toHaveAttribute('type', 'button');
    });
  });

  describe('Layers Panel (with layers on state)', () => {
    beforeEach(() => {
      mockViewport.zoom = 1;
    });

    it('should not render layers panel at default zoom (< threshold)', () => {
      mockViewport.zoom = 1;
      renderNodeInFlow({ label: 'server-01' });
      expect(screen.queryByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).not.toBeInTheDocument();
    });

    it('should render layers panel when zoomed in past threshold', () => {
      mockViewport.zoom = 1.5;
      renderNodeInFlow({ label: 'server-01' });
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
    });

    it('should show IP address in layers panel', () => {
      mockViewport.zoom = 2;
      renderNodeInFlow({ label: 'server-01', ips: ['10.128.0.93'] });
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
      expect(screen.getByText('10.128.0.93')).toBeInTheDocument();
    });

    it('should show "—" for IP when ips is absent', () => {
      mockViewport.zoom = 2;
      renderNodeInFlow({ label: 'server-01', ips: undefined });
      const panel = screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID);
      expect(panel).toBeInTheDocument();
    });

    it('should show flag emoji for country code in layers panel', () => {
      mockViewport.zoom = 2;
      renderNodeInFlow({ label: 'server-01', countryCodes: ['US'] });
      const panel = screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID);
      // 🇺🇸 flag emoji for US
      expect(panel.textContent).toContain('🇺🇸');
    });

    it('should show "—" for geolocation when countryCodes is absent', () => {
      mockViewport.zoom = 2;
      renderNodeInFlow({ label: 'server-01', countryCodes: undefined });
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
    });
  });

  describe('Stacked Cards', () => {
    const createNodeProps = (shape: string, count?: number): NodeProps => ({
      id: `test-${shape}-node`,
      data: {
        id: `test-${shape}-node`,
        label: `Test ${shape}`,
        color: 'primary',
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
      width: 300,
      height: 60,
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
      '$shape node stacked cards',
      ({ shape, component: NodeComponent }) => {
        it.each([2, 1000])('shows 2 stacked cards when count is %d', (count) => {
          const props = createNodeProps(shape, count);
          render(
            <ReactFlow>
              <NodeComponent {...props} />
            </ReactFlow>
          );

          expect(screen.getByTestId(GRAPH_ENTITY_NODE_ID)).toBeInTheDocument();
          expect(screen.getAllByTestId(GRAPH_STACKED_SHAPE_ID)).toHaveLength(2);
        });

        it.each([
          { count: 1, description: 'count is 1' },
          { count: 0, description: 'count is 0' },
          { count: -1, description: 'count is negative' },
          { count: undefined, description: 'count is undefined' },
        ])('hides stacked cards when $description', ({ count }) => {
          const props = createNodeProps(shape, count);
          render(
            <ReactFlow>
              <NodeComponent {...props} />
            </ReactFlow>
          );

          expect(screen.getByTestId(GRAPH_ENTITY_NODE_ID)).toBeInTheDocument();
          expect(screen.queryAllByTestId(GRAPH_STACKED_SHAPE_ID)).toHaveLength(0);
        });
      }
    );
  });
});
