/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlow } from '@xyflow/react';
import { TestProviders } from '../mock/test_providers';
import { DiamondNode, EllipseNode, HexagonNode, PentagonNode, RectangleNode } from '.';
import type { EntityNodeViewModel } from '../types';
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

    it('should use id as label when label is not provided', () => {
      renderNodeInFlow({
        id: 'id-used-as-label',
      });

      expect(screen.getByText('id-used-as-label')).toBeInTheDocument();
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
      expect(screen.getByTestId(GRAPH_IPS_TEXT_ID).textContent).toBe('IP: 192.168.1.1');
      expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID).textContent).toBe('+1');
      expect(screen.getAllByTestId(GRAPH_FLAGS_VISIBLE_FLAG_ID)).toHaveLength(2);
      expect(screen.getByTestId(GRAPH_FLAGS_PLUS_COUNT_ID).textContent).toBe('+1');
    });

    it('should render node with many IPs', () => {
      const manyIps = Array.from({ length: 10 }, (_, i) => `192.168.1.${i + 1}`);
      renderNodeInFlow({ ips: manyIps });

      expect(screen.getByTestId(GRAPH_IPS_TEXT_ID).textContent).toBe('IP: 192.168.1.1');
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
});
