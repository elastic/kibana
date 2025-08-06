/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Minimap } from './minimap';
import { Graph, type GraphProps } from './graph/graph';
import {
  GRAPH_MINIMAP_ENTITY_NODE_ID,
  GRAPH_MINIMAP_ID,
  GRAPH_MINIMAP_LABEL_NODE_ID,
  GRAPH_MINIMAP_UNKNOWN_NODE_ID,
  GRAPH_WRAPPER_ID,
} from './test_ids';
import { NODE_HEIGHT, NODE_WIDTH, NODE_LABEL_HEIGHT, NODE_LABEL_WIDTH } from './node/styles';

// // Mock the EUI theme hook
// jest.mock('@elastic/eui', () => ({
//   ...jest.requireActual('@elastic/eui'),
//   useEuiTheme: jest.fn().mockReturnValue({
//     euiTheme: {
//       colors: {
//         primary: '#0079a5',
//         success: '#00a69b',
//         warning: '#f29d41',
//         danger: '#e5183b',
//         darkShade: '#343741',
//         darkestShade: '#1a1c21',
//         emptyShade: '#ffffff',
//         subduedText: '#69707d',
//       },
//       border: {
//         thin: '1px solid #d3dae6',
//         radius: {
//           medium: '4px',
//         },
//       },
//       shadow: {
//         small: '0 2px 4px rgba(0, 0, 0, 0.1)',
//       },
//     },
//   }),
// }));

xdescribe('Minimap', () => {
  it('should render empty', () => {
    render(<Minimap />);
    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap).toBeInTheDocument();
  });

  it('should apply custom styles when provided', () => {
    const customStyle = { height: 200, width: 300 };
    render(<Minimap style={customStyle} />);
    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap).toBeInTheDocument();

    // Check that the custom styles are applied
    // Note: This is a simplistic check, in a real test we might use a more sophisticated approach
    // to verify the style properties are correctly applied to the DOM
    expect(minimap.getAttribute('style')).toContain('height: 200px');
    expect(minimap.getAttribute('style')).toContain('width: 300px');
  });
});

describe('Minimap integrated with Graph', () => {
  const renderGraphPreview = (props: GraphProps) => render(<Graph {...props} />);

  it('should not render minimap by default in interactive graph', () => {
    renderGraphPreview({
      nodes: [],
      edges: [],
      interactive: true,
    });

    expect(screen.queryByTestId(GRAPH_MINIMAP_ID)).not.toBeInTheDocument();
  });

  it('should render minimap when showMinimap is true in interactive graph', () => {
    renderGraphPreview({
      nodes: [],
      edges: [],
      interactive: true,
      showMinimap: true,
    });

    expect(screen.queryByTestId(GRAPH_MINIMAP_ID)).toBeInTheDocument();
  });

  it('should not render Minimap even with showMinimap if graph is not interactive', () => {
    renderGraphPreview({
      nodes: [],
      edges: [],
      interactive: false,
      showMinimap: true,
    });

    expect(screen.queryByTestId(GRAPH_MINIMAP_ID)).not.toBeInTheDocument();
  });

  it('should render minimap but not be pannable nor zoomable if interactive graph is locked', async () => {
    renderGraphPreview({
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
    renderGraphPreview({
      nodes: [
        {
          id: '1',
          label: 'Node 1',
          color: 'primary',
          shape: 'hexagon',
        },
        {
          id: '2',
          label: 'Node 2',
          color: 'danger',
          shape: 'rectangle',
        },
      ],
      edges: [
        {
          id: 'a(1)-b(2)',
          color: 'primary',
          source: '1',
          target: '2',
        },
      ],
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
    const graph = screen.getByTestId(GRAPH_WRAPPER_ID);
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
    renderGraphPreview({
      nodes: [
        {
          id: '1',
          label: 'Node 1',
          color: 'primary',
          shape: 'hexagon',
        },
        {
          id: '2',
          label: 'Node 2',
          color: 'danger',
          shape: 'rectangle',
        },
      ],
      edges: [
        {
          id: 'a(1)-b(2)',
          color: 'primary',
          source: '1',
          target: '2',
        },
      ],
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
    const graph = screen.getByTestId(GRAPH_WRAPPER_ID);
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
    renderGraphPreview({
      nodes: [
        {
          id: '1',
          label: 'Node 1',
          color: 'primary',
          shape: 'hexagon',
        },
        {
          id: '2',
          label: 'Node 2',
          color: 'danger',
          shape: 'rectangle',
        },
        {
          id: 'a(1)-b(2)label(Action)',
          label: 'Action',
          source: '1',
          target: '2',
          color: 'primary',
          shape: 'label',
        },
      ],
      edges: [
        {
          id: 'a(1)-b(a(1)-b(2)label(Action))',
          source: '1',
          sourceShape: 'ellipse',
          target: 'a(1)-b(2)label(Action)',
          targetShape: 'label',
          color: 'primary',
        },
        {
          id: 'a(a(1)-b(2)label(Action))-b(2)',
          source: 'a(1)-b(2)label(Action)',
          sourceShape: 'label',
          target: '2',
          targetShape: 'hexagon',
          color: 'primary',
        },
      ],
      interactive: true,
      showMinimap: true,
    });

    const minimap = screen.getByTestId(GRAPH_MINIMAP_ID);
    expect(minimap).toBeInTheDocument();

    // TODO Find graph entity and label nodes
    // const graphEntityNodes =

    // Check Minimap contains the same number of nodes as Graph
    const minimapEntityNodes = screen.getAllByTestId(GRAPH_MINIMAP_ENTITY_NODE_ID);
    expect(minimapEntityNodes).toHaveLength(2);
    const minimapLabelNodes = screen.getAllByTestId(GRAPH_MINIMAP_LABEL_NODE_ID);
    expect(minimapLabelNodes).toHaveLength(1);
    expect(screen.queryAllByTestId(GRAPH_MINIMAP_UNKNOWN_NODE_ID)).toHaveLength(0);

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

    // TODO Verify each minimap node has proper x,y coordinates

    // // Verify each minimap node has proper x,y coordinates
    // expect(
    //   minimapEntityNodes.every((node) => {
    //     const rectElement = node.querySelector('rect');
    //     return rectElement && rectElement.hasAttribute('x') && rectElement.hasAttribute('y');
    //   })
    // ).toBe(true);

    // // Verify Minimap nodes have the same X,Y coordinates as Graph nodes
    // expect(
    //   minimapEntityNodes.every((node) => {
    //     const rectElement = node.querySelector('rect');
    //     const graphNode = graphDom.querySelector(`[data-id="${node.dataset.id}"] rect`);
    //     return (
    //       rectElement &&
    //       graphNode &&
    //       rectElement.getAttribute('x') === graphNode.getAttribute('x') &&
    //       rectElement.getAttribute('y') === graphNode.getAttribute('y')
    //     );
    //   })
    // ).toBe(true);

    // Verify Minimap only renders nodes (no edges or groups)
    const minimapChildren = minimap?.querySelector('svg')?.children!;
    expect(minimapEntityNodes.length + minimapLabelNodes.length).toBe(3);
    // Check minimap title exists
    expect(minimap?.querySelector('svg')?.querySelectorAll('title')).toHaveLength(1);
    // Check minimap mask (denotes the current viewport in graph) exists
    expect(minimap?.querySelector('svg')?.querySelectorAll('path')).toHaveLength(1);
    // Check total number of elements matches the expected
    expect(minimapChildren).toHaveLength(5); // 3 nodes + 1 title + 1 path
  });
});
