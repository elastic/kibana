/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlow } from '@xyflow/react';
import { BottomBar } from './bottom_bar';
import { DEFAULT_GRAPH_FILTERS } from './apply_filters_popover';
import { GraphInteractionToolContext } from './graph_interaction_tool_context';
import { GraphSearchProvider } from './graph_search_context';
import {
  GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID,
  GRAPH_BOTTOM_BAR_KEYBOARD_SHORTCUTS_ID,
  GRAPH_BOTTOM_BAR_PAN_TOOL_ID,
  GRAPH_BOTTOM_BAR_SEARCH_ID,
  GRAPH_BOTTOM_BAR_SELECT_TOOL_ID,
} from '../test_ids';

const renderBottomBar = (
  interactionTool: 'select' | 'pan' = 'select',
  setInteractionTool = jest.fn(),
  registerApplyFiltersToggle = jest.fn(),
  registerSearchPanelToggle = jest.fn(),
  registerFocusSearchInput = jest.fn()
) =>
  render(
    <ReactFlow>
      <GraphSearchProvider>
        <GraphInteractionToolContext.Provider
          value={{
            interactionTool,
            setInteractionTool,
            registerApplyFiltersToggle,
            registerSearchPanelToggle,
            registerFocusSearchInput,
          }}
        >
          <BottomBar filtersState={DEFAULT_GRAPH_FILTERS} onFiltersChange={jest.fn()} nodes={[]} />
        </GraphInteractionToolContext.Provider>
      </GraphSearchProvider>
    </ReactFlow>
  );

describe('BottomBar', () => {
  it('renders keyboard shortcuts, tools, search, and display controls', () => {
    renderBottomBar();

    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_KEYBOARD_SHORTCUTS_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_SELECT_TOOL_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_PAN_TOOL_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_SEARCH_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_SELECT_TOOL_ID)).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('switches to pan tool when pan button is clicked', async () => {
    const setInteractionTool = jest.fn();
    renderBottomBar('select', setInteractionTool);

    await userEvent.click(screen.getByTestId(GRAPH_BOTTOM_BAR_PAN_TOOL_ID));

    expect(setInteractionTool).toHaveBeenCalledWith('pan');
  });

  it('shows shortcut hints in tool button aria labels', () => {
    renderBottomBar();

    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_SELECT_TOOL_ID)).toHaveAttribute(
      'aria-label',
      'Select   V'
    );
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_PAN_TOOL_ID)).toHaveAttribute(
      'aria-label',
      'Pan   Space'
    );
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_SEARCH_ID)).toHaveAttribute(
      'aria-label',
      'Search   S'
    );
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID)).toHaveAttribute(
      'aria-label',
      'Display   D'
    );
  });

  it('registers panel toggles with the graph context', () => {
    const registerApplyFiltersToggle = jest.fn();
    const registerSearchPanelToggle = jest.fn();
    const registerFocusSearchInput = jest.fn();
    renderBottomBar(
      'select',
      jest.fn(),
      registerApplyFiltersToggle,
      registerSearchPanelToggle,
      registerFocusSearchInput
    );

    expect(registerApplyFiltersToggle).toHaveBeenCalledWith(expect.any(Function));
    expect(registerSearchPanelToggle).toHaveBeenCalledWith(expect.any(Function));
    expect(registerFocusSearchInput).toHaveBeenCalledWith(expect.any(Function));
  });
});
