/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactFlow } from '@xyflow/react';
import { EuiThemeProvider } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { BottomBar } from './bottom_bar';
import { DEFAULT_GRAPH_FILTERS } from './apply_filters_popover';
import { GraphInteractionToolContext } from './graph_interaction_tool_context';
import { GraphSearchProvider } from './graph_search_context';
import type { NodeViewModel } from '../types';
import {
  GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID,
  GRAPH_BOTTOM_BAR_KEYBOARD_SHORTCUTS_ID,
} from '../test_ids';

jest.mock('react-use/lib/useLocalStorage', () => jest.fn().mockReturnValue([false, jest.fn()]));

const DISPLAY_STARTING_POINT_TOUR_TITLE = 'Your starting point is highlighted';

const mockToursIsEnabled = jest.fn(() => true);
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const { notificationServiceMock } = jest.requireActual('@kbn/core/public/mocks');

  return {
    useKibana: () => ({
      services: {
        notifications: {
          ...notificationServiceMock.createStartContract(),
          tours: {
            isEnabled: mockToursIsEnabled,
          },
        },
      },
    }),
  };
});

const originNode: NodeViewModel = {
  id: 'origin-entity',
  label: 'Origin Entity',
  color: 'primary',
  shape: 'ellipse',
  isOrigin: true,
};

const renderBottomBar = (
  registerApplyFiltersToggle = jest.fn(),
  registerSearchPanelToggle = jest.fn(),
  registerFocusSearchInput = jest.fn(),
  nodes: NodeViewModel[] = []
) =>
  render(
    <EuiThemeProvider>
      <ReactFlow>
        <GraphSearchProvider>
          <GraphInteractionToolContext.Provider
            value={{
              registerApplyFiltersToggle,
              registerSearchPanelToggle,
              registerFocusSearchInput,
            }}
          >
            <BottomBar
              filtersState={DEFAULT_GRAPH_FILTERS}
              onFiltersChange={jest.fn()}
              nodes={nodes}
            />
          </GraphInteractionToolContext.Provider>
        </GraphSearchProvider>
      </ReactFlow>
    </EuiThemeProvider>
  );

beforeEach(() => {
  mockToursIsEnabled.mockReturnValue(true);
  (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);
});

describe('BottomBar', () => {
  it('renders keyboard shortcuts and display controls', () => {
    renderBottomBar();

    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_KEYBOARD_SHORTCUTS_ID)).toBeInTheDocument();
    expect(
      screen.queryByTestId('cloudSecurityGraphGraphInvestigationSearch')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID)).toBeInTheDocument();
  });

  it('shows shortcut hints in control button aria labels', () => {
    renderBottomBar();

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
      registerApplyFiltersToggle,
      registerSearchPanelToggle,
      registerFocusSearchInput
    );

    expect(registerApplyFiltersToggle).toHaveBeenCalledWith(expect.any(Function));
    expect(registerSearchPanelToggle).toHaveBeenCalledWith(expect.any(Function));
    expect(registerFocusSearchInput).toHaveBeenCalledWith(expect.any(Function));
  });

  describe('display starting point tour', () => {
    it('opens the tour on first visit when origin nodes are present', () => {
      let shouldShowDisplayTour = true;
      const setShouldShowDisplayTourMock = jest.fn((value: boolean) => {
        shouldShowDisplayTour = value;
      });
      (useLocalStorage as jest.Mock).mockImplementation(() => [
        shouldShowDisplayTour,
        setShouldShowDisplayTourMock,
      ]);

      renderBottomBar(jest.fn(), jest.fn(), jest.fn(), [originNode]);

      expect(screen.getByText(DISPLAY_STARTING_POINT_TOUR_TITLE)).toBeInTheDocument();
    });

    it('does not open the tour when there are no origin nodes', () => {
      (useLocalStorage as jest.Mock).mockReturnValue([true, jest.fn()]);

      renderBottomBar();

      expect(screen.queryByText(DISPLAY_STARTING_POINT_TOUR_TITLE)).not.toBeInTheDocument();
    });

    it('does not open the tour when it was previously dismissed', () => {
      (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

      renderBottomBar(jest.fn(), jest.fn(), jest.fn(), [originNode]);

      expect(screen.queryByText(DISPLAY_STARTING_POINT_TOUR_TITLE)).not.toBeInTheDocument();
    });

    it('dismisses the tour when the display button is clicked', async () => {
      let shouldShowDisplayTour = true;
      const setShouldShowDisplayTourMock = jest.fn((value: boolean) => {
        shouldShowDisplayTour = value;
      });
      (useLocalStorage as jest.Mock).mockImplementation(() => [
        shouldShowDisplayTour,
        setShouldShowDisplayTourMock,
      ]);

      renderBottomBar(jest.fn(), jest.fn(), jest.fn(), [originNode]);

      expect(screen.getByText(DISPLAY_STARTING_POINT_TOUR_TITLE)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId(GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID));

      await waitFor(() => {
        expect(screen.queryByText(DISPLAY_STARTING_POINT_TOUR_TITLE)).not.toBeInTheDocument();
      });
      expect(setShouldShowDisplayTourMock).toHaveBeenCalledWith(false);
    });
  });
});
