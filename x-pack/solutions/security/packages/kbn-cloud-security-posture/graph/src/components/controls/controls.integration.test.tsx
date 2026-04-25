/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

  describe('center graph on nodes with isOrigin or isOriginAlert flags', () => {
    it('should render center button when some nodes have isOrigin set to true', async () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
          },
          {
            id: 'node2',
            label: 'Label Node',
            color: 'primary',
            shape: 'label',
            isOrigin: true,
          },
          {
            id: 'node3',
            label: 'Node 3',
            color: 'primary',
            shape: 'ellipse',
          },
        ],
        edges: [],
        interactive: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID)).toBeInTheDocument();
      });
    });

    it('should render center button when some nodes have isOriginAlert set to true', async () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
          },
          {
            id: 'node2',
            label: 'Label Node',
            color: 'danger',
            shape: 'label',
            isOriginAlert: true,
          },
          {
            id: 'node3',
            label: 'Node 3',
            color: 'primary',
            shape: 'ellipse',
          },
        ],
        edges: [],
        interactive: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID)).toBeInTheDocument();
      });
    });

    it('should not render center button when no nodes have isOrigin or isOriginAlert set to true', async () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Node 1',
            color: 'primary',
            shape: 'hexagon',
          },
          {
            id: 'node2',
            label: 'Node 2',
            color: 'danger',
            shape: 'label',
            // undefined isOrigin and isOriginAlert should be treated as false
          },
          {
            id: 'node3',
            label: 'Node 3',
            color: 'primary',
            shape: 'ellipse',
          },
        ],
        edges: [],
        interactive: true,
      });

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).not.toBeInTheDocument();
      });
    });

    it('should not render center button when nodes array is empty', async () => {
      renderGraphPreview({
        nodes: [],
        edges: [],
        interactive: true,
      });

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).not.toBeInTheDocument();
      });
    });

    it('should center graph on only nodes with isOrigin=true or isOriginAlert=true regardless of edge connections when center button is clicked', async () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'actor',
            label: 'Actor Node',
            color: 'primary',
            shape: 'hexagon',
          },
          {
            id: 'originEvent',
            label: 'Origin Event',
            color: 'primary',
            shape: 'label',
            isOrigin: true,
          },
          {
            id: 'originAlert',
            label: 'Origin Alert',
            color: 'danger',
            shape: 'label',
            isOriginAlert: true,
          },
          {
            id: 'noOriginEvent',
            label: 'No Origin Event',
            color: 'primary',
            shape: 'label',
          },
          {
            id: 'noOriginAlert',
            label: 'No Origin Alert',
            color: 'danger',
            shape: 'label',
          },
          {
            id: 'target',
            label: 'Target Node',
            color: 'primary',
            shape: 'ellipse',
          },
        ],
        edges: [
          { id: 'actorToLabel1', color: 'primary', source: 'actor', target: 'originEvent' },
          { id: 'actorToLabel2', color: 'primary', source: 'actor', target: 'originAlert' },
          { id: 'actorToLabel3', color: 'primary', source: 'actor', target: 'noOriginEvent' },
          { id: 'actorToLabel4', color: 'primary', source: 'actor', target: 'noOriginAlert' },

          { id: 'labelToTarget1', color: 'primary', source: 'originEvent', target: 'target' },
          { id: 'labelToTarget2', color: 'primary', source: 'originAlert', target: 'target' },
          { id: 'labelToTarget3', color: 'primary', source: 'noOriginEvent', target: 'target' },
          { id: 'labelToTarget4', color: 'primary', source: 'noOriginAlert', target: 'target' },
        ],
        interactive: true,
      });

      await waitFor(() => {
        expect(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID)).toBeInTheDocument();
      });

      await act(() => {
        fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID));
      });

      await waitFor(() => {
        expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
          duration: 200,
          nodes: [{ id: 'originEvent' }, { id: 'originAlert' }],
        });
      });
    });

    it('should update center button visibility when nodes change dynamically', async () => {
      const { rerender } = renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Label Node 1',
            color: 'primary',
            shape: 'label',
            isOrigin: false,
          },
        ],
        edges: [],
        interactive: true,
      });

      await waitFor(() => {
        // Initially no center button
        expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).not.toBeInTheDocument();
      });

      rerender(
        <TestProviders>
          <Graph
            nodes={[
              {
                id: 'node1',
                label: 'Label Node 1',
                color: 'primary',
                shape: 'label',
                isOrigin: true,
              },
            ]}
            edges={[]}
            interactive={true}
          />
        </TestProviders>
      );

      await waitFor(() => {
        // Now center button should appear
        expect(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID)).toBeInTheDocument();
      });
    });
  });

  describe('Controls visibility', () => {
    it('should not render controls when graph is non-interactive', async () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Label Node 1',
            color: 'primary',
            shape: 'label',
            isOrigin: true,
          },
        ],
        edges: [],
        interactive: false,
      });

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_IN_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_CONTROLS_FIT_VIEW_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).not.toBeInTheDocument();
      });
    });

    it('should render controls when graph is interactive but locked', async () => {
      renderGraphPreview({
        nodes: [
          {
            id: 'node1',
            label: 'Label Node 1',
            color: 'primary',
            shape: 'label',
            isOrigin: true,
          },
        ],
        edges: [],
        interactive: true,
        isLocked: true,
      });

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_IN_ID)).toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID)).toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_CONTROLS_FIT_VIEW_ID)).toBeInTheDocument();
        expect(screen.queryByTestId(GRAPH_CONTROLS_CENTER_ID)).toBeInTheDocument();
      });

      await act(() => {
        // Zoom-in button should still work when locked
        fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_ZOOM_IN_ID));
      });
      await waitFor(() => {
        expect(useReactFlowMock().zoomIn).toHaveBeenCalledWith({
          duration: 200,
        });
      });

      await act(() => {
        // Zoom-out button should still work when locked
        fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_ZOOM_OUT_ID));
      });
      await waitFor(() => {
        expect(useReactFlowMock().zoomOut).toHaveBeenCalledWith({
          duration: 200,
        });
      });

      await act(() => {
        // Fit-view button should still work when locked
        fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_FIT_VIEW_ID));
      });
      await waitFor(() => {
        expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
          duration: 200,
        });
      });

      await act(() => {
        // Center button should still work when locked
        fireEvent.click(screen.getByTestId(GRAPH_CONTROLS_CENTER_ID));
      });
      await waitFor(() => {
        expect(useReactFlowMock().fitView).toHaveBeenCalledWith({
          duration: 200,
          nodes: [{ id: 'node1' }],
        });
      });
    });
  });
});
