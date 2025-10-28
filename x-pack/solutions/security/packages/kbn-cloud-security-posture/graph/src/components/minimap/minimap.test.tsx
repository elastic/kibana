/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactFlow } from '@xyflow/react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Minimap } from './minimap';
import { Graph, type GraphProps } from '../graph/graph';
import {
  GRAPH_ID,
  GRAPH_ENTITY_NODE_ID,
  GRAPH_LABEL_NODE_ID,
  GRAPH_STACK_NODE_ID,
  GRAPH_EDGE_ID,
  GRAPH_MINIMAP_ID,
  GRAPH_MINIMAP_ENTITY_NODE_ID,
  GRAPH_MINIMAP_LABEL_NODE_ID,
  GRAPH_MINIMAP_UNKNOWN_NODE_ID,
} from '../test_ids';
import { NODE_HEIGHT, NODE_WIDTH, NODE_LABEL_HEIGHT, NODE_LABEL_WIDTH } from '../node/styles';
import type { NodeViewModel } from '../types';
import { graphSample } from '../mock/graph_sample';

describe('Minimap', () => {
  it('should render empty', () => {
    render(
      <ReactFlow>
        <Minimap />
      </ReactFlow>
    );
    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap).toBeInTheDocument();
    expect(minimap.firstChild?.firstChild?.childNodes).toHaveLength(2); // only <title> and <path> for mask
  });

  it('should be at the bottom-left corner and have "backgroundBasePlain" viewport over a "backgroundBaseFormsControlDisabled" frame', async () => {
    render(
      <ReactFlow>
        <Minimap />
      </ReactFlow>
    );

    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap.firstChild).toHaveStyle({
      'background-color': '#FFFFFF',
      '--xy-minimap-mask-background-color-props': 'rgba(202,211,226,0.75)',
    });
    expect(minimap.firstChild).toHaveClass('bottom left');
  });
});

describe('Minimap integrated with Graph', () => {
  const renderGraph = (props: GraphProps) => render(<Graph {...props} />);

  it('should not render minimap by default in interactive graph', () => {
    renderGraph({
      nodes: [],
      edges: [],
      interactive: true,
    });

    expect(screen.queryByTestId(GRAPH_MINIMAP_ID)).not.toBeInTheDocument();
  });

  it('should render minimap when showMinimap is true in interactive graph', () => {
    renderGraph({
      nodes: [],
      edges: [],
      interactive: true,
      showMinimap: true,
    });

    expect(screen.queryByTestId(GRAPH_MINIMAP_ID)).toBeInTheDocument();
  });

  it('should not render Minimap even with showMinimap if graph is not interactive', () => {
    renderGraph({
      nodes: [],
      edges: [],
      interactive: false,
      showMinimap: true,
    });

    expect(screen.queryByTestId(GRAPH_MINIMAP_ID)).not.toBeInTheDocument();
  });

  it('should render minimap but not be pannable nor zoomable if interactive graph is locked', async () => {
    renderGraph({
      nodes: [],
      edges: [],
      interactive: true,
      isLocked: true,
      showMinimap: true,
    });

    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap).toBeInTheDocument();

    // Get initial viewBox of the SVG inside the minimap
    const minimapSvg = minimap.querySelector('svg');
    const initialViewBox = minimapSvg?.getAttribute('viewBox');
    expect(initialViewBox).toBeDefined();

    // Simulate dragging on the minimap (this shouldn't change the viewBox because pannable=false)
    await act(() => {
      fireEvent.mouseDown(minimap);
    });
    await act(() => {
      fireEvent.mouseMove(minimap, { clientX: 50, clientY: 50 });
    });
    await act(() => {
      fireEvent.mouseUp(minimap);
    });

    await waitFor(async () => {
      // Verify the viewBox hasn't changed (minimap is not pannable)
      const viewBoxAfterDrag = minimapSvg?.getAttribute('viewBox');
      expect(viewBoxAfterDrag).toStrictEqual(initialViewBox);
    });

    // Simulate wheel event on the minimap (this shouldn't change the viewBox because zoomable=false)
    await act(() => {
      fireEvent.wheel(minimap, { deltaY: -200 }); // Zoom out attempt
    });

    await waitFor(async () => {
      // Verify the viewBox hasn't changed (minimap is not zoomable)
      const viewBoxAfterZoom = minimapSvg?.getAttribute('viewBox');
      expect(viewBoxAfterZoom).toStrictEqual(initialViewBox);
    });
  });

  it('should render minimap and be pannable', async () => {
    renderGraph({
      ...graphSample,
      interactive: true,
      showMinimap: true,
    });

    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap).toBeInTheDocument();

    // Get initial viewBox of the SVG inside the minimap
    const minimapSvg = minimap.querySelector('svg');
    const initialViewBox = minimapSvg?.getAttribute('viewBox');
    expect(initialViewBox).toBeDefined();

    // Simulate dragging on the graph (this shouldn't change the viewBox because pannable=false)
    const graph = screen.getByTestId(GRAPH_ID);
    await act(async () => {
      fireEvent.mouseDown(graph);
    });
    await act(async () => {
      fireEvent.mouseMove(graph, { clientX: 200, clientY: 200 });
    });
    await act(async () => {
      fireEvent.mouseUp(graph);
    });

    await waitFor(async () => {
      // Verify the viewBox has changed (minimap is pannable)
      const viewBoxAfterDrag = minimapSvg?.getAttribute('viewBox');
      expect(viewBoxAfterDrag).not.toStrictEqual(initialViewBox);
    });
  });

  it('should render minimap and be zoomable', async () => {
    renderGraph({
      ...graphSample,
      interactive: true,
      showMinimap: true,
    });

    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap).toBeInTheDocument();

    // Get initial viewBox of the SVG inside the minimap
    const minimapSvg = minimap.querySelector('svg');
    const initialViewBox = minimapSvg?.getAttribute('viewBox');
    expect(initialViewBox).toBeDefined();

    // Simulate wheel event on the minimap (this shouldn't change the viewBox because zoomable=false)
    const graph = screen.getByTestId(GRAPH_ID);
    await act(() => {
      fireEvent.wheel(graph, { deltaY: -200 }); // Zoom out attempt
    });

    await waitFor(async () => {
      // Verify the viewBox hasn't changed (minimap is not zoomable)
      const viewBoxAfterZoom = minimapSvg?.getAttribute('viewBox');
      expect(viewBoxAfterZoom).not.toStrictEqual(initialViewBox);
    });
  });

  it('should render minimap with same nodes as graph', async () => {
    renderGraph({
      ...graphSample,
      interactive: true,
      showMinimap: true,
    });

    await waitFor(() => {
      // Check Graph has expected nodes
      // 3 entity nodes: A, B, C
      // 3 label nodes: IndividualLabel, StackedLabel1, StackedLabel2
      // 1 stack node: Stack(StackedLabel1, StackedLabel2)
      // 8 edges:
      //   A->IndividualLabel, IndividualLabel->B
      //   B->Stack
      //   Stack->StackedLabel1, StackedLabel1->Stack
      //   Stack->StackedLabel2, StackedLabel2->Stack
      //   Stack->C
      const graphEntityNodes = screen.getAllByTestId(GRAPH_ENTITY_NODE_ID);
      expect(graphEntityNodes).toHaveLength(3);
      const graphLabelNodes = screen.getAllByTestId(GRAPH_LABEL_NODE_ID);
      expect(graphLabelNodes).toHaveLength(3);
      const graphStackNodes = screen.getAllByTestId(GRAPH_STACK_NODE_ID);
      expect(graphStackNodes).toHaveLength(1);
      const graphEdgeNodes = screen.getAllByTestId(GRAPH_EDGE_ID);
      expect(graphEdgeNodes).toHaveLength(8);

      // Check Minimap contains the same number of entity and label nodes as Graph
      // Check it does not render stack nodes or edges
      // Total DOM elements: 3 entity nodes + 3 label nodes + 1 <title> + 1 <path>
      const minimapEntityNodes = screen.getAllByTestId(GRAPH_MINIMAP_ENTITY_NODE_ID);
      expect(minimapEntityNodes).toHaveLength(graphEntityNodes.length); // 3

      const minimapLabelNodes = screen.getAllByTestId(GRAPH_MINIMAP_LABEL_NODE_ID);
      expect(minimapLabelNodes).toHaveLength(graphLabelNodes.length); // 3

      const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
      expect(minimapEntityNodes.length + minimapLabelNodes.length).toBe(6);
      expect(minimap?.querySelector('svg')?.querySelectorAll('title')).toHaveLength(1);
      expect(minimap?.querySelector('svg')?.querySelectorAll('path')).toHaveLength(1);

      const minimapChildren = minimap.querySelector('svg')?.children!;
      expect(minimapChildren).toHaveLength(graphEntityNodes.length + graphLabelNodes.length + 2);
    });
  });

  it('should render unknown-type nodes with fallback shape', async () => {
    renderGraph({
      nodes: [
        {
          id: 'unknown',
          shape: 'unknown' as unknown as NodeViewModel['shape'],
          color: 'primary',
        },
      ] as NodeViewModel[],
      edges: [],
      interactive: true,
      showMinimap: true,
    });

    await waitFor(() => {
      const minimapUnknownNodes = screen.getAllByTestId(GRAPH_MINIMAP_UNKNOWN_NODE_ID);
      expect(minimapUnknownNodes).toHaveLength(1);
    });
  });

  it('should render minimap nodes with the same dimensions as graph nodes', async () => {
    renderGraph({
      ...graphSample,
      interactive: true,
      showMinimap: true,
    });

    await waitFor(() => {
      const minimapEntityNodes = screen.getAllByTestId(GRAPH_MINIMAP_ENTITY_NODE_ID);
      const minimapLabelNodes = screen.getAllByTestId(GRAPH_MINIMAP_LABEL_NODE_ID);

      // Verify Minimap entity nodes have the correct dimensions (but scaled down)
      expect(
        minimapEntityNodes.every(
          (node) =>
            node.getAttribute('width') === NODE_WIDTH.toString() &&
            node.getAttribute('height') === NODE_HEIGHT.toString()
        )
      ).toBe(true);

      // Verify Minimap label nodes have the correct dimensions (but scaled down)
      expect(
        minimapLabelNodes.every(
          (node) =>
            node.getAttribute('width') === NODE_LABEL_WIDTH.toString() &&
            node.getAttribute('height') === NODE_LABEL_HEIGHT.toString()
        )
      ).toBe(true);
    });
  });
});
