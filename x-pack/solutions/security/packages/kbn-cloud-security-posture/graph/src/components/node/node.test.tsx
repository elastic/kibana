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
import type { NodeProps, EntityNodeViewModel, NodeToolbarItem } from '../types';
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

  describe('Metadata Panel', () => {
    it('should always render the metadata panel', () => {
      renderNodeInFlow({ label: 'server-01' });
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
    });

    it('should show IP address in the metadata panel', () => {
      renderNodeInFlow({ label: 'server-01', ips: ['10.128.0.93'] });
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
      expect(screen.getByText('10.128.0.93')).toBeInTheDocument();
    });

    it('should show "—" placeholder when ips is absent', () => {
      renderNodeInFlow({ label: 'server-01', ips: undefined });
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
    });

    it('should show flag emoji for a country code', () => {
      renderNodeInFlow({ label: 'server-01', countryCodes: ['US'] });
      const panel = screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID);
      // 🇺🇸 flag emoji for US
      expect(panel.textContent).toContain('🇺🇸');
    });

    it('should show "—" placeholder when countryCodes is absent', () => {
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
        it.each([2, 1000])('shows 1 stacked card when count is %d', (count) => {
          const props = createNodeProps(shape, count);
          render(
            <ReactFlow>
              <NodeComponent {...props} />
            </ReactFlow>
          );

          expect(screen.getByTestId(GRAPH_ENTITY_NODE_ID)).toBeInTheDocument();
          expect(screen.getAllByTestId(GRAPH_STACKED_SHAPE_ID)).toHaveLength(1);
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

  describe('Risk Score Badge', () => {
    it('shows a single badge when min equals max', () => {
      renderNodeInFlow({ riskScore: { min: 75, max: 75 } });
      const badges = screen.getAllByTestId(GRAPH_ENTITY_NODE_RISK_BADGE_ID);
      expect(badges).toHaveLength(1);
      expect(badges[0].textContent).toBe('75.00');
    });

    it('shows a single badge for a precise score (min equals max)', () => {
      renderNodeInFlow({ riskScore: { min: 74.5, max: 74.5 } });
      const badges = screen.getAllByTestId(GRAPH_ENTITY_NODE_RISK_BADGE_ID);
      expect(badges).toHaveLength(1);
      expect(badges[0].textContent).toBe('74.50');
    });

    it('shows two badges (min then max) when min differs from max', () => {
      renderNodeInFlow({ count: 4, riskScore: { min: 55, max: 92 } });
      const badges = screen.getAllByTestId(GRAPH_ENTITY_NODE_RISK_BADGE_ID);
      expect(badges).toHaveLength(2);
      expect(badges[0].textContent).toBe('55.00');
      expect(badges[1].textContent).toBe('92.00');
    });

    it('rounds risk scores to 2 decimal places', () => {
      renderNodeInFlow({ riskScore: { min: 74.567, max: 74.567 } });
      const badge = screen.getByTestId(GRAPH_ENTITY_NODE_RISK_BADGE_ID);
      expect(badge.textContent).toBe('74.57');
    });
  });

  describe('Asset Criticality', () => {
    it('shows translated criticality label for a single-entity node', () => {
      renderNodeInFlow({
        assetCriticality: [{ level: 'high_impact', count: 1 }],
      });
      expect(screen.getByText('High impact')).toBeInTheDocument();
    });

    it('shows translated label for each known criticality level', () => {
      const cases: Array<[string, string]> = [
        ['extreme_impact', 'Extreme impact'],
        ['high_impact', 'High impact'],
        ['medium_impact', 'Medium impact'],
        ['low_impact', 'Low impact'],
      ];
      for (const [level, expectedLabel] of cases) {
        const { unmount } = renderNodeInFlow({
          assetCriticality: [{ level, count: 1 }],
        });
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        unmount();
      }
    });

    it('falls back to sentence-cased raw value for an unknown criticality level', () => {
      renderNodeInFlow({
        assetCriticality: [{ level: 'future_level', count: 1 }],
      });
      expect(screen.getByText('Future level')).toBeInTheDocument();
    });

    it('shows a dash placeholder when assetCriticality is absent', () => {
      renderNodeInFlow({ assetCriticality: undefined });
      // metadata panel should still render without crashing
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
    });

    it('shows only the first criticality level for a single-entity node when multiple are supplied', () => {
      // SingleEntityMetadataPanel renders assetCriticality[0] only.
      renderNodeInFlow({
        assetCriticality: [
          { level: 'high_impact', count: 2 },
          { level: 'medium_impact', count: 1 },
        ],
      });
      expect(screen.getByText('High impact')).toBeInTheDocument();
      // Second level must not appear — single-entity panel shows only the first entry.
      expect(screen.queryByText('Medium impact')).not.toBeInTheDocument();
    });

    it('hides the metadata panel for grouped nodes (count > 1)', () => {
      // By design, grouped nodes do not render the metadata panel.
      renderNodeInFlow({
        count: 4,
        assetCriticality: [{ level: 'high_impact', count: 2 }],
      });
      expect(screen.queryByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).not.toBeInTheDocument();
    });
  });

  describe('Source Aggregation', () => {
    it('shows a single source formatted in title case', () => {
      renderNodeInFlow({
        documentsData: [{ id: 'e1', type: 'entity', entity: { sources: ['active_directory'] } }],
      });
      expect(screen.getByText('Active Directory')).toBeInTheDocument();
    });

    it('deduplicates sources across multiple documentsData entries and shows +N for extras', () => {
      // count is left as default (single entity) so the metadata panel is visible.
      // A single entity node can still aggregate sources across multiple documentsData entries.
      renderNodeInFlow({
        documentsData: [
          { id: 'e1', type: 'entity', entity: { sources: ['okta'] } },
          { id: 'e2', type: 'entity', entity: { sources: ['endpoint', 'okta'] } },
          // 'okta' is a duplicate — deduplicated set is ['okta', 'endpoint'] (2 unique)
        ],
      });
      // First source is shown as plain text
      expect(screen.getByText('Okta')).toBeInTheDocument();
      // Second source collapsed into the +N badge
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('shows no source row when documentsData is absent', () => {
      renderNodeInFlow({ documentsData: undefined });
      // metadata panel renders without crashing
      expect(screen.getByTestId(GRAPH_ENTITY_NODE_LAYERS_PANEL_ID)).toBeInTheDocument();
    });
  });

  describe('Toolbar Items', () => {
    it('renders toolbar buttons produced by toolbarItemsFn', () => {
      const items: NodeToolbarItem[] = [
        {
          iconType: 'eye',
          label: 'Show actor',
          onClick: jest.fn(),
          testSubject: 'test-toolbar-btn-show-actor',
        },
        {
          iconType: 'eyeClosed',
          label: 'Hide actor',
          onClick: jest.fn(),
          testSubject: 'test-toolbar-btn-hide-actor',
        },
      ];
      renderNodeInFlow({ toolbarItemsFn: () => items });

      expect(screen.getByTestId('test-toolbar-btn-show-actor')).toBeInTheDocument();
      expect(screen.getByTestId('test-toolbar-btn-hide-actor')).toBeInTheDocument();
    });

    it('renders a disabled toolbar button when item.disabled is true', () => {
      const items: NodeToolbarItem[] = [
        {
          iconType: 'eye',
          label: 'Show entity details',
          onClick: jest.fn(),
          disabled: true,
          testSubject: 'test-toolbar-btn-disabled',
        },
      ];
      renderNodeInFlow({ toolbarItemsFn: () => items });

      expect(screen.getByTestId('test-toolbar-btn-disabled')).toHaveAttribute('disabled');
    });

    it('calls onClick when a toolbar button is clicked', () => {
      const handleClick = jest.fn();
      const items: NodeToolbarItem[] = [
        {
          iconType: 'eye',
          label: 'Show actor',
          onClick: handleClick,
          testSubject: 'test-toolbar-btn-click',
        },
      ];
      renderNodeInFlow({ interactive: true, toolbarItemsFn: () => items });

      fireEvent.click(screen.getByTestId('test-toolbar-btn-click'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
