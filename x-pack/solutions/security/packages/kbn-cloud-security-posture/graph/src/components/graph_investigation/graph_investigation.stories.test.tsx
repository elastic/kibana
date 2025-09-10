/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { setProjectAnnotations, composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { action } from '@storybook/addon-actions';
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
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
} from '../test_ids';
import * as previewAnnotations from '../../../.storybook/preview';
import { NOTIFICATIONS_ADD_ERROR_ACTION } from '../../../.storybook/constants';
import { USE_FETCH_GRAPH_DATA_REFRESH_ACTION } from '../mock/constants';
import { mockDataView } from '../mock/data_view.mock';

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
    </IntlProvider>,
    {
      // TODO: Fails in concurrent mode
      legacyRoot: true,
    }
  );
};

// Turn off the optimization that hides elements that are not visible in the viewport
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
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
  expect(btn).toHaveTextContent("Show this entity's actions");
  btn.click();
};

const hideActionsByNode = (container: HTMLElement, nodeId: string) => {
  expandNode(container, nodeId);

  const hideBtn = screen.getByTestId(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
  expect(hideBtn).toHaveTextContent("Hide this entity's actions");
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

describe('GraphInvestigation Component', () => {
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
    expect(nodes).toHaveLength(6);
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

  describe('popover', () => {
    it('shows `Show event details` list item when label node has documentsData of event', () => {
      const { container, getByTestId } = renderStory();

      expandNode(
        container,
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)'
      );

      const showDetailsItem = getByTestId(GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID);
      expect(showDetailsItem).toHaveTextContent('Show event details');
    });

    it('shows `Show alert details` list item when label node has documentsData of alert', () => {
      const { container, getByTestId } = renderStory();

      expandNode(
        container,
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)'
      );

      const showDetailsItem = getByTestId(GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID);
      expect(showDetailsItem).toHaveTextContent('Show alert details');
    });

    it('should not show `Show event details` list item when label node misses documentsData', () => {
      const { container, queryByTestId } = renderStory();

      expandNode(
        container,
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.DeleteRole)'
      );

      const showDetailsItem = queryByTestId(GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID);
      expect(showDetailsItem).not.toBeInTheDocument();
    });

    it('shows `Show entity details` list item when entity node has documentsData', () => {
      const { container, getByTestId } = renderStory();

      expandNode(container, 'projects/your-project-id/roles/customRole');

      const showDetailsItem = getByTestId(GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID);
      expect(showDetailsItem).toHaveTextContent('Show entity details');
    });

    it('should not show `Show entity details` list item when entity node misses documentsData', () => {
      const { container, queryByTestId } = renderStory();

      expandNode(container, 'admin@example.com');
      const showDetailsItem = queryByTestId(GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID);
      expect(showDetailsItem).not.toBeInTheDocument();
    });
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
        "Show this entity's actions"
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
        "Show this entity's actions"
      );
    });
  });

  describe('investigateInTimeline', () => {
    it('has originEventIds, empty query and no filters - calls onInvestigateInTimeline action with event.id filter only', () => {
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

    it('has originEventIds, has a query and no filters - calls onInvestigateInTimeline action with event.id in the query but not in the filters', async () => {
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
      expect(onInvestigateInTimeline.mock.calls[0][FILTERS_PARAM_IDX]).toEqual([]);
    });

    it('has originEventIds, empty query and there are filters - calls onInvestigateInTimeline action with event.id filter only', async () => {
      // Arrange
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId, container } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
      });
      const entityIdFilter = 'admin@example.com';

      // Act
      showActionsByNode(container, entityIdFilter);
      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      // Assert
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
            params: [
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'actor.entity.id',
                  index: '1235',
                  key: 'actor.entity.id',
                  negate: false,
                  params: {
                    query: entityIdFilter,
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'actor.entity.id': entityIdFilter,
                  },
                },
              },
              ...['1', '2'].map((eventId) => ({
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'event.id',
                  index: eventId === '1' ? '1235' : undefined,
                  ...(eventId === '2' ? { disabled: false } : {}),
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
            ],
            type: 'combined',
            relation: 'OR',
          }),
        },
      ]);
    });

    it('has originEventIds, has query and there are filters - calls onInvestigateInTimeline action with event.id filter and query', async () => {
      // Arrange
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId, container } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
      });
      const entityIdFilter = 'admin@example.com';

      // Act
      showActionsByNode(container, entityIdFilter);
      const queryInput = getByTestId('queryInput');
      await userEvent.type(queryInput, 'host1');
      const querySubmitBtn = getByTestId('querySubmitButton');
      querySubmitBtn.click();

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
            params: [
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'actor.entity.id',
                  index: '1235',
                  key: 'actor.entity.id',
                  negate: false,
                  params: {
                    query: entityIdFilter,
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'actor.entity.id': entityIdFilter,
                  },
                },
              },
              ...['1', '2'].map((eventId) => ({
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'event.id',
                  index: eventId === '1' ? '1235' : undefined,
                  ...(eventId === '2' ? { disabled: false } : {}),
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
            ],
            type: 'combined',
            relation: 'OR',
          }),
        },
      ]);
    });

    it('empty originEventIds, empty query and no filters - calls onInvestigateInTimeline with empty query and no filters', () => {
      // Arrange
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
        initialState: {
          dataView: mockDataView,
          originEventIds: [],
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
        },
      });

      // Act
      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      // Assert
      expect(onInvestigateInTimeline).toHaveBeenCalled();
      expect(onInvestigateInTimeline.mock.calls[0][QUERY_PARAM_IDX]).toEqual({
        query: '',
        language: 'kuery',
      });
      // Should have empty filters since there are no originEventIds
      expect(onInvestigateInTimeline.mock.calls[0][FILTERS_PARAM_IDX]).toEqual([]);
    });

    it('empty originEventIds, has query and no filters - calls onInvestigateInTimeline with query only', async () => {
      // Arrange
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
        initialState: {
          dataView: mockDataView,
          originEventIds: [],
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
        },
      });

      // Act
      const queryInput = getByTestId('queryInput');
      await userEvent.type(queryInput, 'host1');
      const querySubmitBtn = getByTestId('querySubmitButton');
      querySubmitBtn.click();

      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      // Assert
      expect(onInvestigateInTimeline).toHaveBeenCalled();
      // Query should remain unchanged since there are no originEventIds to add
      expect(onInvestigateInTimeline.mock.calls[0][QUERY_PARAM_IDX]).toEqual({
        query: 'host1',
        language: 'kuery',
      });
      expect(onInvestigateInTimeline.mock.calls[0][FILTERS_PARAM_IDX]).toEqual([]);
    });

    it('empty originEventIds, empty query and has filters - calls onInvestigateInTimeline with empty query and filters', async () => {
      // Arrange
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId, container } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
        initialState: {
          dataView: mockDataView,
          originEventIds: [],
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
        },
      });
      const entityIdFilter = 'admin@example.com';

      // Act
      showActionsByNode(container, entityIdFilter);
      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      // Assert
      expect(onInvestigateInTimeline).toHaveBeenCalled();
      // Query should remain unchanged since there are no originEventIds to add
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
            field: 'actor.entity.id',
            key: 'actor.entity.id',
            params: {
              query: entityIdFilter,
            },
            type: 'phrase',
          }),
          query: {
            match_phrase: {
              'actor.entity.id': entityIdFilter,
            },
          },
        },
      ]);
    });

    it('empty originEventIds, has query and has filters - calls onInvestigateInTimeline with query and filters', async () => {
      // Arrange
      const onInvestigateInTimeline = jest.fn();
      const { getByTestId, container } = renderStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
        initialState: {
          dataView: mockDataView,
          originEventIds: [],
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
        },
      });
      const entityIdFilter = 'admin@example.com';

      // Act
      showActionsByNode(container, entityIdFilter);
      const queryInput = getByTestId('queryInput');
      await userEvent.type(queryInput, 'host1');
      const querySubmitBtn = getByTestId('querySubmitButton');
      querySubmitBtn.click();
      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      // Assert
      expect(onInvestigateInTimeline).toHaveBeenCalled();
      // Query should remain unchanged since there are no originEventIds to add
      expect(onInvestigateInTimeline.mock.calls[0][QUERY_PARAM_IDX]).toEqual({
        query: 'host1',
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
            field: 'actor.entity.id',
            key: 'actor.entity.id',
            params: {
              query: entityIdFilter,
            },
            type: 'phrase',
          }),
          query: {
            match_phrase: {
              'actor.entity.id': entityIdFilter,
            },
          },
        },
      ]);
    });
  });
});
