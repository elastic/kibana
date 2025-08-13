/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Graph, type GraphProps } from '../graph/graph';
import { TestProviders } from '../mock/test_providers';
import {
  GRAPH_CONTROLS_CENTER_ID,
  GRAPH_CONTROLS_FIT_VIEW_ID,
  GRAPH_CONTROLS_ZOOM_IN_ID,
  GRAPH_CONTROLS_ZOOM_OUT_ID,
} from '../test_ids';

jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useReactFlow: jest.fn(),
  useStore: jest.fn(),
}));

const useReactFlowMock = useReactFlow as jest.Mock;
const useStoreMock = useStore as jest.Mock;

describe('Controls integration with Graph', () => {
  const renderGraphPreview = (props: GraphProps) =>
    render(
      <TestProviders>
        <Graph {...props} />
      </TestProviders>
    );

  beforeEach(() => {
    useReactFlowMock.mockReturnValue({
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      fitView: jest.fn(),
    });

    useStoreMock.mockReturnValue({ minZoomReached: false, maxZoomReached: false });
  });

  describe('center graph to nodes with hasOriginEvents flag', () => {
    it('should render center button when all nodes have hasOriginEvents set to true', () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
            hasOriginEvents: true,
          },
          {
            id: 'node2',
            label: 'Node 2',
            color: 'primary',
            shape: 'rectangle',
            hasOriginEvents: true,
          },
          {
            id: 'node3',
            label: 'Node 3',
            color: 'primary',
            shape: 'ellipse',
            hasOriginEvents: true,
          },
        ],
        edges: [],
        interactive: true,
      });

      const centerButton = screen.getByTestId(GRAPH_CONTROLS_CENTER_ID);
      expect(centerButton).toBeInTheDocument();
    });

    it('should render center button when some nodes have hasOriginEvents set to true', () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
            hasOriginEvents: true,
          },
          {
            id: 'node2',
            label: 'Node 2',
            color: 'primary',
            shape: 'rectangle',
            hasOriginEvents: false,
          },
          {
            id: 'node3',
            label: 'Node 3',
            color: 'primary',
            shape: 'ellipse',
            // hasOriginEvents undefined (should be treated as false)
          },
        ],
        edges: [],
        interactive: true,
      });

      const centerButton = screen.getByTestId(GRAPH_CONTROLS_CENTER_ID);
      expect(centerButton).toBeInTheDocument();
    });

    it('should not render center button when no nodes have hasOriginEvents set to true', () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
            hasOriginEvents: false,
          },
          {
            id: 'node2',
            label: 'Node 2',
            color: 'primary',
            shape: 'rectangle',
            hasOriginEvents: false,
          },
          {
            id: 'node3',
            label: 'Node 3',
            color: 'primary',
            shape: 'ellipse',
            // hasOriginEvents undefined (should be treated as false)
          },
        ],
        edges: [],
        interactive: true,
      });

      const centerButton = screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID);
      expect(centerButton).not.toBeInTheDocument();
    });

    it('should not render center button when nodes array is empty', () => {
      renderGraphPreview({
        nodes: [],
        edges: [],
        interactive: true,
      });

      const centerButton = screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID);
      expect(centerButton).not.toBeInTheDocument();
    });

    it('should center graph to only nodes with hasOriginEvents=true regardless of edge connections when center button is clicked', () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'origin1',
            label: 'Origin Node 1',
            color: 'primary',
            shape: 'hexagon',
            hasOriginEvents: true,
          },
          {
            id: 'regular1',
            label: 'Regular Node 1',
            color: 'primary',
            shape: 'rectangle',
            hasOriginEvents: false,
          },
          {
            id: 'origin2',
            label: 'Origin Node 2',
            color: 'primary',
            shape: 'ellipse',
            hasOriginEvents: true,
          },
          {
            id: 'regular2',
            label: 'Regular Node 2',
            color: 'primary',
            shape: 'diamond',
            // hasOriginEvents undefined
          },
          {
            id: 'origin3-isolated',
            label: 'Regular Node 2',
            color: 'primary',
            shape: 'diamond',
            hasOriginEvents: true,
          },
        ],
        edges: [
          { id: 'edge1', color: 'primary', source: 'origin1', target: 'regular1' },
          { id: 'edge2', color: 'primary', source: 'origin1', target: 'origin2' },
          { id: 'edge1', color: 'primary', source: 'regular1', target: 'regular2' },
        ],
        interactive: true,
      });

      const centerButton = screen.getByTestId(GRAPH_CONTROLS_CENTER_ID);
      expect(centerButton).toBeInTheDocument();

      fireEvent.click(centerButton);

      // Should only center on nodes with hasOriginEvents=true
      expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
        duration: 200,
        nodes: [{ id: 'origin1' }, { id: 'origin2' }, { id: 'origin3-isolated' }],
      });
    });

    it('should update center button visibility when nodes change dynamically', () => {
      const { rerender } = renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
            hasOriginEvents: false,
          },
        ],
        edges: [],
        interactive: true,
      });

      // Initially no center button
      expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).not.toBeInTheDocument();

      // Update node to have hasOriginEvents=true
      rerender(
        <TestProviders>
          <Graph
            nodes={[
              {
                id: 'node1',
                label: 'Node 1',
                color: 'primary',
                shape: 'hexagon',
                hasOriginEvents: true,
              },
            ]}
            edges={[]}
            interactive={true}
          />
        </TestProviders>
      );

      // Now center button should appear
      expect(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID)).toBeInTheDocument();
    });
  });

  describe('Controls visibility', () => {
    it('should not render controls when graph is non-interactive', () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
            hasOriginEvents: true,
          },
        ],
        edges: [],
        interactive: false,
      });

      expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_IN_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_CONTROLS_FIT_VIEW_ID)).not.toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).not.toBeInTheDocument();
    });

    it('should render controls when graph is interactive but locked', () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
            hasOriginEvents: true,
          },
        ],
        edges: [],
        interactive: true,
        isLocked: true,
      });

      expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_IN_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_CONTROLS_FIT_VIEW_ID)).toBeInTheDocument();
      expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).toBeInTheDocument();

      // Zoom-in button should still work when locked
      fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_ZOOM_IN_ID));
      expect(useReactFlowMock().zoomIn).toHaveBeenCalledWith({
        duration: 200,
      });

      // Zoom-out button should still work when locked
      fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID));
      expect(useReactFlowMock().zoomOut).toHaveBeenCalledWith({
        duration: 200,
      });

      // Fit-view button should still work when locked
      fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID));
      expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
        duration: 200,
      });

      // Center button should still work when locked
      fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID));
      expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
        duration: 200,
        nodes: [{ id: 'node1' }],
      });
    });
  });
});
