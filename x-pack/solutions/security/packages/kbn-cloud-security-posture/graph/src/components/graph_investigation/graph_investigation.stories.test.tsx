/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setProjectAnnotations } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { composeStories } from '@storybook/testing-react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import * as stories from './graph_investigation.stories';
import { type GraphInvestigationProps } from './graph_investigation';
import {
  GRAPH_INVESTIGATION_TEST_ID,
  GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID,
  GRAPH_ACTIONS_TOGGLE_SEARCH_ID,
  NODE_EXPAND_BUTTON_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
} from '../test_ids';
import * as previewAnnotations from '../../../.storybook/preview';
import { NOTIFICATIONS_ADD_ERROR_ACTION } from '../../../.storybook/constants';
import { USE_FETCH_GRAPH_DATA_REFRESH_ACTION } from '../mock/constants';

setProjectAnnotations(previewAnnotations);

const { Investigation } = composeStories(stories);

// Mock the useFetchGraphData hook, which is used by the GraphInvestigation component
// Callbacks replaced with storybook actions, therefore we mock storybook's action function as well for testing
jest.mock('../../hooks/use_fetch_graph_data', () => {
  return require('../mock/use_fetch_graph_data.mock');
});

const actionMocks: Record<string, jest.Mock> = {};

jest.mock('@storybook/addon-actions', () => ({
  action: jest.fn((name) => {
    if (!actionMocks[name]) {
      actionMocks[name] = jest.fn(); // Create a new mock if not already present
    }
    return actionMocks[name]; // Return the mock for the given action name
  }),
}));

const renderStory = (args: Partial<GraphInvestigationProps> = {}) => {
  return render(
    <IntlProvider locale="en">
      <Investigation {...args} />
    </IntlProvider>
  );
};

// Turn off the optimization that hides elements that are not visible in the viewport
jest.mock('../graph/constants', () => ({
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

// By default we toggle the search bar visibility
jest.mock('react-use/lib/useSessionStorage', () => jest.fn().mockReturnValue([true, jest.fn()]));

const QUERY_PARAM_IDX = 0;
const FILTERS_PARAM_IDX = 1;

const expandNode = (container: HTMLElement, nodeId: string) => {
  const nodeElement = container.querySelector(
    `.react-flow__nodes .react-flow__node[data-id="${nodeId}"]`
  );
  expect(nodeElement).not.toBeNull();
  userEvent.hover(nodeElement!);
  (
    nodeElement?.querySelector(
      `[data-test-subj="${NODE_EXPAND_BUTTON_TEST_ID}"]`
    ) as HTMLButtonElement
  )?.click();
};

const showActionsByNode = (container: HTMLElement, nodeId: string) => {
  expandNode(container, nodeId);

  const btn = screen.getByTestId(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
  expect(btn).toHaveTextContent('Show actions by this entity');
  btn.click();
};

const hideActionsByNode = (container: HTMLElement, nodeId: string) => {
  expandNode(container, nodeId);

  const hideBtn = screen.getByTestId(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
  expect(hideBtn).toHaveTextContent('Hide actions by this entity');
  hideBtn.click();
};

const disableFilter = (container: HTMLElement, filterIndex: number) => {
  const filterBtn = container.querySelector(
    `[data-test-subj*="filter-id-${filterIndex}"]`
  ) as HTMLButtonElement;
  expect(filterBtn).not.toBeNull();
  filterBtn.click();

  const disableFilterBtn = screen.getByTestId('disableFilter');
  expect(disableFilterBtn).not.toBeNull();
  disableFilterBtn.click();
};

const isSearchBarVisible = (container: HTMLElement) => {
  const searchBarContainer = container.querySelector('.toggled-off');
  return searchBarContainer === null;
};

// FLAKY: https://github.com/elastic/kibana/issues/206646
describe.skip('GraphInvestigation Component', () => {
  beforeEach(() => {
    for (const key in actionMocks) {
      if (Object.prototype.hasOwnProperty.call(actionMocks, key)) {
        actionMocks[key].mockClear();
      }
    }
  });

  it('renders without crashing', () => {
    const { getByTestId } = renderStory();

    expect(getByTestId(GRAPH_INVESTIGATION_TEST_ID)).toBeInTheDocument();
  });

  it('renders with initial state', () => {
    const { container, getAllByText } = renderStory();

    const nodes = container.querySelectorAll('.react-flow__nodes .react-flow__node');
    expect(nodes).toHaveLength(3);
    expect(getAllByText('~ an hour ago')).toHaveLength(2);
  });

  it('shows error on bad kql syntax', async () => {
    const mockDangerToast = action(NOTIFICATIONS_ADD_ERROR_ACTION);
    const { getByTestId } = renderStory();

    // Act
    const queryInput = getByTestId('queryInput');
    await userEvent.type(queryInput, '< > sdg $@#T');
    const querySubmitBtn = getByTestId('querySubmitButton');
    querySubmitBtn.click();

    // Assert
    expect(mockDangerToast).toHaveBeenCalledTimes(1);
  });

  it('calls refresh on submit button click', () => {
    const mockRefresh = action(USE_FETCH_GRAPH_DATA_REFRESH_ACTION);
    const { getByTestId } = renderStory();

    // Act
    getByTestId('querySubmitButton').click();

    // Assert
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  describe('searchBar', () => {
    it('shows searchBar when search button toggle is hidden', () => {
      const { getByTestId, queryByTestId, container } = renderStory();

      expect(queryByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).not.toBeInTheDocument();
      expect(getByTestId('globalQueryBar')).toBeInTheDocument();
      expect(isSearchBarVisible(container)).toBeTruthy();
    });

    it('toggles searchBar on click', async () => {
      let searchBarToggled = false;
      const setSearchBarToggled = jest.fn((value: boolean) => {
        searchBarToggled = value;
      });
      (useSessionStorage as jest.Mock).mockImplementation(() => [
        searchBarToggled,
        setSearchBarToggled,
      ]);
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });

      expect(isSearchBarVisible(container)).toBeFalsy();

      // Act
      getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID).click();

      // Assert
      expect(setSearchBarToggled).lastCalledWith(true);
    });

    it('toggles searchBar off on click', async () => {
      let searchBarToggled = true;
      const setSearchBarToggled = jest.fn((value: boolean) => {
        searchBarToggled = value;
      });
      (useSessionStorage as jest.Mock).mockImplementation(() => [
        searchBarToggled,
        setSearchBarToggled,
      ]);
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });

      expect(isSearchBarVisible(container)).toBeTruthy();

      // Act
      getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID).click();

      // Assert
      expect(setSearchBarToggled).lastCalledWith(false);
    });

    it('shows filters counter when KQL filter is applied', async () => {
      const { getByTestId } = renderStory({
        showToggleSearch: true,
      });

      const queryInput = getByTestId('queryInput');
      await userEvent.type(queryInput, 'host1');
      const querySubmitBtn = getByTestId('querySubmitButton');
      querySubmitBtn.click();

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('1');
    });

    it('shows filters counter when node filter is applied', () => {
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });
      expandNode(container, 'admin@example.com');
      getByTestId(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID).click();

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('1');
    });

    it('hide filters counter when node filter is toggled off', () => {
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });
      showActionsByNode(container, 'admin@example.com');

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('1');

      hideActionsByNode(container, 'admin@example.com');

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('');

      expandNode(container, 'admin@example.com');
      expect(getByTestId(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)).toHaveTextContent(
        'Show actions by this entity'
      );
    });

    it('hide filters counter when filter is disabled', () => {
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });
      showActionsByNode(container, 'admin@example.com');

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('1');

      disableFilter(container, 0);

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('');

      expandNode(container, 'admin@example.com');
      expect(getByTestId(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)).toHaveTextContent(
        'Show actions by this entity'
      );
    });
  });

  describe('investigateInTimeline', () => {
    it('calls onInvestigateInTimeline action', () => {
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
      });

      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      expect(onInvestigateInTimeline).toHaveBeenCalled();
      expect(onInvestigateInTimeline.mock.calls[0][QUERY_PARAM_IDX]).toEqual({
        query: '',
        language: 'kuery',
      });
      expect(onInvestigateInTimeline.mock.calls[0][FILTERS_PARAM_IDX]).toEqual([
        {
          $state: {
            store: 'appState',
          },
          meta: expect.objectContaining({
            disabled: false,
            index: '1235',
            negate: false,
            controlledBy: 'graph-investigation',
            params: ['1', '2'].map((eventId) => ({
              meta: {
                controlledBy: 'graph-investigation',
                field: 'event.id',
                index: '1235',
                key: 'event.id',
                negate: false,
                params: {
                  query: eventId,
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'event.id': eventId,
                },
              },
            })),
            type: 'combined',
            relation: 'OR',
          }),
        },
      ]);
    });

    it('query includes origin event ids onInvestigateInTimeline callback', async () => {
      // Arrange
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
      });
      const queryInput = getByTestId('queryInput');
      await userEvent.type(queryInput, 'host1');
      const querySubmitBtn = getByTestId('querySubmitButton');
      querySubmitBtn.click();

      // Act
      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      // Assert
      expect(onInvestigateInTimeline).toHaveBeenCalled();
      expect(onInvestigateInTimeline.mock.calls[0][QUERY_PARAM_IDX]).toEqual({
        query: '(host1) OR event.id: "1" OR event.id: "2"',
        language: 'kuery',
      });
      expect(onInvestigateInTimeline.mock.calls[0][FILTERS_PARAM_IDX]).toEqual([
        {
          $state: {
            store: 'appState',
          },
          meta: expect.objectContaining({
            disabled: false,
            index: '1235',
            negate: false,
            controlledBy: 'graph-investigation',
            params: ['1', '2'].map((eventId) => ({
              meta: {
                controlledBy: 'graph-investigation',
                field: 'event.id',
                index: '1235',
                key: 'event.id',
                negate: false,
                params: {
                  query: eventId,
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'event.id': eventId,
                },
              },
            })),
            type: 'combined',
            relation: 'OR',
          }),
        },
      ]);
    });
  });
});
