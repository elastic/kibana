/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useReactFlow } from '@xyflow/react';
import { Graph, type GraphProps } from '../graph/graph';
import { TestProviders } from '../mock/test_providers';
import { GRAPH_CONTROLS_CENTER_ID } from '../test_ids';

jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn(),
}));

const useReactFlowMock = useReactFlow as jest.Mock;

describe('Controls integration with Graph', () => {
  const renderGraphPreview = (props: GraphProps) =>
    render(
      <TestProviders>
        <Graph {...props} />
      </TestProviders>
    );

  it.only('should pass exact starting node IDs to Controls as nodeIdsToCenter', () => {
    renderGraphPreview({
      nodes: [
        { id: 'start1', label: 'Start 1', color: 'primary', shape: 'hexagon' },
        { id: 'start2', label: 'Start 2', color: 'primary', shape: 'rectangle' },
        { id: 'target1', label: 'Target 1', color: 'primary', shape: 'ellipse' },
        { id: 'target2', label: 'Target 2', color: 'primary', shape: 'diamond' },
      ],
      edges: [
        { id: 'edge1', color: 'primary', source: 'start1', target: 'target1' },
        { id: 'edge2', color: 'primary', source: 'start2', target: 'target2' },
      ],
      interactive: true,
    });

    const centerButton = screen.getByTestId(GRAPH_CONTROLS_CENTER_ID);
    expect(centerButton).toBeInTheDocument();

    fireEvent.click(centerButton);

    expect(useReactFlowMock).toHaveBeenCalledWith({
      duration: 200,
      nodes: [{ id: 'start1' }, { id: 'start2' }],
    });
  });

  it('should pass all node IDs when no edges exist (all nodes are starting nodes)', () => {
    const { container } = renderGraphPreview({
      nodes: [
        { id: 'node1', label: 'Node 1', color: 'primary', shape: 'hexagon' },
        { id: 'node2', label: 'Node 2', color: 'primary', shape: 'rectangle' },
        { id: 'node3', label: 'Node 3', color: 'primary', shape: 'ellipse' },
      ],
      edges: [],
      interactive: true,
    });

    const mockedControls = container.querySelector('[data-testid="mocked-controls"]');
    expect(mockedControls).toBeInTheDocument();

    const nodeIds = JSON.parse(mockedControls?.getAttribute('data-node-ids') || '[]');
    expect(nodeIds).toEqual(['node1', 'node2', 'node3']);
  });

  it('should pass empty array when all nodes are targets', () => {
    const { container } = renderGraphPreview({
      nodes: [
        { id: 'node1', label: 'Node 1', color: 'primary', shape: 'hexagon' },
        { id: 'node2', label: 'Node 2', color: 'primary', shape: 'rectangle' },
      ],
      edges: [
        { id: 'edge1', color: 'primary', source: 'node1', target: 'node2' },
        { id: 'edge2', color: 'primary', source: 'node2', target: 'node1' },
      ],
      interactive: true,
    });

    const mockedControls = container.querySelector('[data-testid="mocked-controls"]');
    expect(mockedControls).toBeInTheDocument();

    const nodeIds = JSON.parse(mockedControls?.getAttribute('data-node-ids') || '[]');
    expect(nodeIds).toEqual([]);
  });

  it('should pass starting nodes (non-target nodes) to Controls as nodeIdsToCenter', () => {
    const { container } = renderGraphPreview({
      nodes: [
        {
          id: 'node1',
          label: 'Starting Node 1',
          color: 'primary',
          shape: 'hexagon',
        },
        {
          id: 'node2',
          label: 'Starting Node 2',
          color: 'primary',
          shape: 'rectangle',
        },
        {
          id: 'node3',
          label: 'Target Node 1',
          color: 'primary',
          shape: 'ellipse',
        },
        {
          id: 'node4',
          label: 'Target Node 2',
          color: 'primary',
          shape: 'diamond',
        },
      ],
      edges: [
        {
          id: 'edge1',
          color: 'primary',
          source: 'node1',
          target: 'node3',
        },
        {
          id: 'edge2',
          color: 'primary',
          source: 'node2',
          target: 'node4',
        },
      ],
      interactive: true,
    });

    // Verify that the Controls component is rendered
    const controlsContainer = container.querySelector('.react-flow__panel');
    expect(controlsContainer).toBeInTheDocument();

    // Verify that center button is rendered (which means nodeIdsToCenter has valid nodes)
    // In this case, node1 and node2 are starting nodes (not targets of any edge)
    const centerButton = container.querySelector(
      '[data-test-subj="cloudSecurityGraphGraphInvestigationCenter"]'
    );
    expect(centerButton).toBeInTheDocument();
  });

  it('should not render center button when all nodes are targets of edges', () => {
    const { container } = renderGraphPreview({
      nodes: [
        {
          id: 'node1',
          label: 'Source Node',
          color: 'primary',
          shape: 'hexagon',
        },
        {
          id: 'node2',
          label: 'Target Node',
          color: 'primary',
          shape: 'rectangle',
        },
      ],
      edges: [
        {
          id: 'edge1',
          color: 'primary',
          source: 'node1',
          target: 'node2',
        },
        // Edge that makes node1 also a target
        {
          id: 'edge2',
          color: 'primary',
          source: 'node2',
          target: 'node1',
        },
      ],
      interactive: true,
    });

    // Verify that the Controls component is rendered
    const controlsContainer = container.querySelector('.react-flow__panel');
    expect(controlsContainer).toBeInTheDocument();

    // Verify that center button is NOT rendered (since no starting nodes exist)
    const centerButton = container.querySelector(
      '[data-test-subj="cloudSecurityGraphGraphInvestigationCenter"]'
    );
    expect(centerButton).not.toBeInTheDocument();
  });

  it('should render center button when there are isolated nodes (no edges)', () => {
    const { container } = renderGraphPreview({
      nodes: [
        {
          id: 'isolated1',
          label: 'Isolated Node 1',
          color: 'primary',
          shape: 'hexagon',
        },
        {
          id: 'isolated2',
          label: 'Isolated Node 2',
          color: 'primary',
          shape: 'rectangle',
        },
      ],
      edges: [],
      interactive: true,
    });

    // Verify that the Controls component is rendered
    const controlsContainer = container.querySelector('.react-flow__panel');
    expect(controlsContainer).toBeInTheDocument();

    // Verify that center button is rendered (all nodes are starting nodes when no edges exist)
    const centerButton = container.querySelector(
      '[data-test-subj="cloudSecurityGraphGraphInvestigationCenter"]'
    );
    expect(centerButton).toBeInTheDocument();
  });

  it('should not render center button in non-interactive mode', () => {
    const { container } = renderGraphPreview({
      nodes: [
        {
          id: 'node1',
          label: 'Starting Node',
          color: 'primary',
          shape: 'hexagon',
        },
      ],
      edges: [],
      interactive: false, // Non-interactive mode
    });

    // Verify that the Controls component is NOT rendered in non-interactive mode
    const controlsContainer = container.querySelector('.react-flow__panel');
    expect(controlsContainer).not.toBeInTheDocument();

    // Verify that center button is NOT rendered
    const centerButton = container.querySelector(
      '[data-test-subj="cloudSecurityGraphGraphInvestigationCenter"]'
    );
    expect(centerButton).not.toBeInTheDocument();
  });

  it('should correctly identify starting nodes in complex graph topology', () => {
    const { container } = renderGraphPreview({
      nodes: [
        { id: 'start1', label: 'Start 1', color: 'primary', shape: 'hexagon' },
        { id: 'start2', label: 'Start 2', color: 'primary', shape: 'rectangle' },
        { id: 'middle1', label: 'Middle 1', color: 'primary', shape: 'ellipse' },
        { id: 'middle2', label: 'Middle 2', color: 'primary', shape: 'diamond' },
        { id: 'end1', label: 'End 1', color: 'primary', shape: 'pentagon' },
        { id: 'isolated', label: 'Isolated', color: 'primary', shape: 'hexagon' },
      ],
      edges: [
        { id: 'e1', color: 'primary', source: 'start1', target: 'middle1' },
        { id: 'e2', color: 'primary', source: 'start2', target: 'middle2' },
        { id: 'e3', color: 'primary', source: 'middle1', target: 'end1' },
        { id: 'e4', color: 'primary', source: 'middle2', target: 'end1' },
        // Note: 'isolated' node has no edges, so it's also a starting node
      ],
      interactive: true,
    });

    // Starting nodes should be: start1, start2, isolated
    // Target nodes are: middle1, middle2, end1

    const controlsContainer = container.querySelector('.react-flow__panel');
    expect(controlsContainer).toBeInTheDocument();

    // Center button should be rendered since we have starting nodes
    const centerButton = container.querySelector(
      '[data-test-subj="cloudSecurityGraphGraphInvestigationCenter"]'
    );
    expect(centerButton).toBeInTheDocument();
  });
});
