/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlow } from '@xyflow/react';
import { TestProviders } from '../../mock/test_providers';
import { mockReactFlow } from '../../mock/react_flow';
import { EntityNode } from './entity_node';
import type { EntityNodeViewModel } from '../../types';
import {
  GRAPH_ENTITY_NODE_CARD_ID,
  GRAPH_ENTITY_NODE_SIMPLIFIED_ID,
  GRAPH_NODE_EXPAND_BUTTON_ID,
  GRAPH_ENTITY_NODE_BUTTON_ID,
} from '../../test_ids';
import { useDetailLevel } from '../../detail_level';

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

jest.mock('../../detail_level', () => ({
  ...jest.requireActual('../../detail_level'),
  useDetailLevel: jest.fn(),
}));

const useDetailLevelMock = useDetailLevel as jest.MockedFunction<typeof useDetailLevel>;

const data: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
  interactive: true,
};

const renderNode = (overrides: Partial<EntityNodeViewModel> = {}) =>
  render(
    <TestProviders>
      <ReactFlow
        fitView
        nodeTypes={{ rectangle: EntityNode }}
        nodes={[
          {
            id: data.id,
            type: 'rectangle',
            position: { x: 0, y: 0 },
            data: { ...data, ...overrides },
          },
        ]}
        edges={[]}
      />
    </TestProviders>
  );

describe('EntityNode', () => {
  beforeAll(() => {
    mockReactFlow();
  });

  afterEach(() => jest.clearAllMocks());

  it('renders the detailed card when detail level is detailed', () => {
    useDetailLevelMock.mockReturnValue('detailed');
    renderNode();
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_CARD_ID)).toBeInTheDocument();
  });

  it('renders the simplified tile when detail level is simplified', () => {
    useDetailLevelMock.mockReturnValue('simplified');
    renderNode();
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_SIMPLIFIED_ID)).toBeInTheDocument();
  });

  it('renders the expand button for interactive nodes', () => {
    useDetailLevelMock.mockReturnValue('detailed');
    renderNode({ interactive: true });
    expect(screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID)).toBeInTheDocument();
  });

  it('omits the expand button for non-interactive nodes', () => {
    useDetailLevelMock.mockReturnValue('detailed');
    renderNode({ interactive: false });
    expect(screen.queryByTestId(GRAPH_NODE_EXPAND_BUTTON_ID)).not.toBeInTheDocument();
  });

  it('wraps the expand button in its own positioned wrapper (above the click overlay)', () => {
    useDetailLevelMock.mockReturnValue('detailed');
    renderNode({ interactive: true });
    const button = screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID);
    // button -> NodeExpandButtonContainer -> EntityNodeExpandButtonWrapper
    const wrapper = button.parentElement?.parentElement as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    // The wrapper is a dedicated element separate from the click overlay container.
    expect(wrapper).not.toBe(screen.getByTestId(GRAPH_ENTITY_NODE_BUTTON_ID).parentElement);
  });

  it('fires expandButtonClick when the expand button is clicked in detailed mode', () => {
    useDetailLevelMock.mockReturnValue('detailed');
    const expandButtonClick = jest.fn();
    renderNode({ interactive: true, expandButtonClick });
    fireEvent.click(screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID));
    expect(expandButtonClick).toHaveBeenCalledTimes(1);
  });

  it('fires expandButtonClick when the expand button is clicked in simplified mode', () => {
    useDetailLevelMock.mockReturnValue('simplified');
    const expandButtonClick = jest.fn();
    renderNode({ interactive: true, expandButtonClick });
    fireEvent.click(screen.getByTestId(GRAPH_NODE_EXPAND_BUTTON_ID));
    expect(expandButtonClick).toHaveBeenCalledTimes(1);
  });

  it('sizes the click overlay to the rendered content (does not extend past it)', () => {
    useDetailLevelMock.mockReturnValue('simplified');
    renderNode({ interactive: true });
    const overlayButton = screen.getByTestId(GRAPH_ENTITY_NODE_BUTTON_ID);
    const overlayContainer = overlayButton.parentElement as HTMLElement;
    expect(overlayContainer.style.width).toBe('100%');
    expect(overlayContainer.style.height).toBe('100%');
  });
});
