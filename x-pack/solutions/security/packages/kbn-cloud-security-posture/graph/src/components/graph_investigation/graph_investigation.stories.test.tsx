/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { setProjectAnnotations, composeStories } from '@storybook/react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { action } from '@storybook/addon-actions';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { buildEsQuery, isCombinedFilter } from '@kbn/es-query';
import * as stories from './graph_investigation.stories';
import { type GraphInvestigationProps } from './graph_investigation';
import {
  GRAPH_INVESTIGATION_TEST_ID,
  GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID,
  GRAPH_ACTIONS_TOGGLE_SEARCH_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_GROUPED_ENTITIES_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID,
} from '../test_ids';
import * as previewAnnotations from '../../../.storybook/preview';
import { NOTIFICATIONS_ADD_ERROR_ACTION } from '../../../.storybook/constants';
import {
  USE_FETCH_GRAPH_DATA_REFRESH_ACTION,
  USE_FETCH_GRAPH_DATA_ACTION,
} from '../mock/constants';
import type { UseFetchGraphDataParams } from '../../hooks/use_fetch_graph_data';
import { mockDataView } from '../mock/data_view.mock';

setProjectAnnotations(previewAnnotations);

const { SingleActor, GroupedActor, GroupedTarget } = composeStories(stories);

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
      <SingleActor {...args} />
    </IntlProvider>,
    {
      // TODO: Fails in concurrent mode
      legacyRoot: true,
    }
  );
};

const renderGroupedActorStory = (args: Partial<GraphInvestigationProps> = {}) => {
  return render(
    <IntlProvider locale="en">
      <GroupedActor {...args} />
    </IntlProvider>,
    {
      legacyRoot: true,
    }
  );
};

const renderGroupedTargetStory = (args: Partial<GraphInvestigationProps> = {}) => {
  return render(
    <IntlProvider locale="en">
      <GroupedTarget {...args} />
    </IntlProvider>,
    {
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

const expandNode = async (container: HTMLElement, nodeId: string) => {
  // Wait for the node to appear in the ReactFlow canvas
  await waitFor(() => {
    expect(
      container.querySelector(`.react-flow__nodes .react-flow__node[data-id="${nodeId}"]`)
    ).not.toBeNull();
  });
  // Hover to set isHovered=true (affects CSS opacity/pointer-events via the NodeToolbar).
  // NodeToolbar items are always in the DOM (isVisible={true}); no expand-button click needed.
  const nodeElement = container.querySelector(
    `.react-flow__nodes .react-flow__node[data-id="${nodeId}"]`
  );
  userEvent.hover(nodeElement!);
};

/**
 * Returns the button with the given data-test-subj inside the NodeToolbar portal for `nodeId`,
 * or null if the toolbar or button is absent.  Scoping prevents false positives when multiple
 * entity nodes have the same button test-subject in the DOM simultaneously.
 *
 * NodeToolbar portals render inside the ReactFlow viewport container (not at document.body),
 * so `document.querySelector` reliably finds them after nodes have mounted.
 */
const getNodeToolbarButton = (nodeId: string, testSubjectId: string) => {
  const toolbar = document.querySelector<HTMLElement>(
    `.react-flow__node-toolbar[data-id="${nodeId}"]`
  );
  return toolbar ? within(toolbar).queryByTestId(testSubjectId) : null;
};

const showActionsByNode = async (container: HTMLElement, nodeId: string) => {
  await expandNode(container, nodeId);
  // NodeToolbar buttons are always in DOM (isVisible={true}); just find the button directly.
  const btn = getNodeToolbarButton(nodeId, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
  expect(btn).not.toBeNull();
  expect(btn).toHaveAttribute('aria-label', "Show this entity's actions");
  // Use fireEvent so the click fires synchronously. The filter-store update propagates via
  // useSyncExternalStore; await waitFor to let the re-render flush before the caller asserts.
  fireEvent.click(btn!);
  await waitFor(() => {
    expect(
      getNodeToolbarButton(nodeId, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)
    ).toHaveAttribute('aria-label', "Hide this entity's actions");
  });
};

const hideActionsByNode = async (container: HTMLElement, nodeId: string) => {
  await expandNode(container, nodeId);
  // NodeToolbar buttons are always in DOM; wait for the filter-active label from the prior click.
  await waitFor(() => {
    expect(
      getNodeToolbarButton(nodeId, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)
    ).toHaveAttribute('aria-label', "Hide this entity's actions");
  });
  const btn = getNodeToolbarButton(nodeId, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
  fireEvent.click(btn!);
  await waitFor(() => {
    expect(
      getNodeToolbarButton(nodeId, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)
    ).toHaveAttribute('aria-label', "Show this entity's actions");
  });
};

const disableFilter = (container: HTMLElement, filterIndex: number) => {
  const filterBtn = within(container).getAllByRole('button', { name: 'Filter actions' })[
    filterIndex
  ];
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

  it('renders with initial state', async () => {
    const { container, getByTestId } = renderStory();

    await waitFor(() => {
      const nodes = container.querySelectorAll('.react-flow__nodes .react-flow__node');
      expect(nodes).toHaveLength(6);
    });
    expect(getByTestId('dateRangePickerValueDisplay')).toHaveTextContent(
      '75 minutes ago → 45 minutes ago'
    );
  });

  it('shows error on bad kql syntax', async () => {
    const mockDangerToast = action(NOTIFICATIONS_ADD_ERROR_ACTION);
    const { getByTestId } = renderStory();

    // Act
    const queryInput = getByTestId('queryInput');
    fireEvent.change(queryInput, { target: { value: '< > sdg $@#T' } });
    const querySubmitBtn = getByTestId('querySubmitButton');
    querySubmitBtn.click();

    // Assert
    expect(mockDangerToast).toHaveBeenCalledTimes(1);
  });

  describe('default filter display', () => {
    it.each([
      { originEventIds: [{ id: 'origin-event', isAlert: false }], entityIds: [] },
      { originEventIds: [], entityIds: [{ id: 'admin@example.com', isOrigin: true }] },
    ])('separates the origin from added filters with OR: %j', async (origins) => {
      const { container } = renderStory({
        initialState: {
          dataView: mockDataView,
          timeRange: { from: 'now-30d', to: 'now' },
          ...origins,
        },
      });

      expect(screen.queryByTestId('graphDefaultFilterOr')).not.toBeInTheDocument();

      await showActionsByNode(container, 'admin@example.com');

      const filterBar = screen.getByTestId('filter-items-group');
      expect(within(filterBar).getByTestId('graphDefaultFilterOr')).toHaveTextContent('OR');
      expect(screen.getByTestId('graphDefaultFilter')).toHaveAttribute('title', '');

      await hideActionsByNode(container, 'admin@example.com');

      expect(screen.queryByTestId('graphDefaultFilterOr')).not.toBeInTheDocument();
    });
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
    it('shows `Show event details` list item when label node has documentsData of event', async () => {
      const { container } = renderStory();
      const nodeId =
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)';

      await expandNode(container, nodeId);

      const showDetailsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );
      expect(showDetailsItem).not.toBeNull();
      expect(showDetailsItem).toHaveAttribute('aria-label', 'Show event details');
    });

    it('shows `Show alert details` list item when label node has documentsData of alert', async () => {
      const { container } = renderStory();
      const nodeId =
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)';

      await expandNode(container, nodeId);

      const showDetailsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );
      expect(showDetailsItem).not.toBeNull();
      expect(showDetailsItem).toHaveAttribute('aria-label', 'Show alert details');
    });

    it('should not show `Show event details` list item when label node misses documentsData', async () => {
      const { container } = renderStory();
      const nodeId =
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.DeleteRole)';

      await expandNode(container, nodeId);

      const showDetailsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );
      expect(showDetailsItem).toBeNull();
    });

    it('shows the option `Show entity details` as enabled when entity node has documentsData with entity data', async () => {
      const { container } = renderStory();
      const nodeId = 'projects/your-project-id/roles/customRole';

      await expandNode(container, nodeId);

      const showDetailsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );
      expect(showDetailsItem).not.toBeNull();
      expect(showDetailsItem).toHaveAttribute('aria-label', 'Show entity details');
      expect(showDetailsItem).not.toHaveAttribute('disabled');
    });

    it('show the option `Show entity details` as disabled when entity node has no documentsData', async () => {
      const { container } = renderStory();
      const nodeId = 'admin@example.com';

      await expandNode(container, nodeId);
      const showDetailsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );
      expect(showDetailsItem).not.toBeNull();
      expect(showDetailsItem).toHaveAttribute('aria-label', 'Show entity details');
      // In the NodeToolbar design the button is rendered disabled; the tooltip test-subj is not
      // forwarded by toToolbarItemsFn, so we verify only the disabled attribute here.
      expect(showDetailsItem).toHaveAttribute('disabled');
    });

    it('shows the option `Show entity relationships` as enabled when entity node is enriched', async () => {
      const { container } = renderStory();
      const nodeId = 'projects/your-project-id/roles/customRole';

      await expandNode(container, nodeId);

      const showRelationshipsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID
      );
      expect(showRelationshipsItem).not.toBeNull();
      expect(showRelationshipsItem).toHaveAttribute('aria-label', 'Show entity relationships');
      expect(showRelationshipsItem).not.toHaveAttribute('disabled');
    });

    it('shows the option `Show entity relationships` as disabled when entity node is not enriched', async () => {
      const { container } = renderStory();
      const nodeId = 'admin@example.com';

      await expandNode(container, nodeId);
      const showRelationshipsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID
      );
      expect(showRelationshipsItem).not.toBeNull();
      expect(showRelationshipsItem).toHaveAttribute('aria-label', 'Show entity relationships');
      // In the NodeToolbar design the button is rendered disabled; the tooltip test-subj is not
      // forwarded by toToolbarItemsFn, so we verify only the disabled attribute here.
      expect(showRelationshipsItem).toHaveAttribute('disabled');
    });

    it('does not show `Show entity relationships` option for grouped entities', async () => {
      const { container } = renderGroupedActorStory();
      const nodeId = 'mixed-entities';

      await expandNode(container, nodeId);

      const showRelationshipsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID
      );
      expect(showRelationshipsItem).toBeNull();
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
      expect(setSearchBarToggled).toHaveBeenLastCalledWith(true);
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
      expect(setSearchBarToggled).toHaveBeenLastCalledWith(false);
    });

    it('shows filters counter when KQL filter is applied', async () => {
      const { getByTestId } = renderStory({
        showToggleSearch: true,
      });

      const queryInput = getByTestId('queryInput');
      fireEvent.change(queryInput, { target: { value: 'host1' } });
      const querySubmitBtn = getByTestId('querySubmitButton');
      querySubmitBtn.click();

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('1');
    });

    it('shows filters counter when node filter is applied', async () => {
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });
      await expandNode(container, 'admin@example.com');
      getNodeToolbarButton(
        'admin@example.com',
        GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID
      )!.click();

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('2');
    });

    it('hide filters counter when node filter is toggled off', async () => {
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });
      await showActionsByNode(container, 'admin@example.com');

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('2');

      await hideActionsByNode(container, 'admin@example.com');

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('');

      await expandNode(container, 'admin@example.com');
      expect(
        getNodeToolbarButton('admin@example.com', GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)
      ).toHaveAttribute('aria-label', "Show this entity's actions");
    });

    it('hide filters counter when filter is disabled', async () => {
      const { getByTestId, container } = renderStory({
        showToggleSearch: true,
      });
      await showActionsByNode(container, 'admin@example.com');

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('2');

      disableFilter(container, 0);

      expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toHaveTextContent('');

      await expandNode(container, 'admin@example.com');
      expect(
        getNodeToolbarButton('admin@example.com', GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)
      ).toHaveAttribute('aria-label', "Show this entity's actions");
    });
  });

  describe('dismisses external overlays on ReactFlow pane click', () => {
    const openFilterDropdown = async (container: HTMLElement) => {
      await showActionsByNode(container, 'admin@example.com');
      const filterButton = await within(container).findByRole('button', { name: 'Filter actions' });
      filterButton.click();
      await waitFor(() => {
        expect(screen.getByTestId('disableFilter')).toBeInTheDocument();
      });
    };

    it('dispatches synthetic mouse events on the container when pointer-down hits the graph pane', async () => {
      // Asserts the synthesized signal is dispatched; jsdom doesn't fully run
      // the focus trap, so the actual overlay close isn't observable here.
      const { container } = renderStory({ showToggleSearch: true });
      await openFilterDropdown(container);

      const pane = container.querySelector('.react-flow__pane') as HTMLElement;
      expect(pane).not.toBeNull();
      const root = container.querySelector(
        `[data-test-subj="${GRAPH_INVESTIGATION_TEST_ID}"]`
      ) as HTMLElement;

      const mouseupSpy = jest.fn();
      root.addEventListener('mouseup', mouseupSpy);
      try {
        fireEvent.pointerDown(pane, { button: 0, isPrimary: true });
      } finally {
        root.removeEventListener('mouseup', mouseupSpy);
      }

      expect(mouseupSpy).toHaveBeenCalled();
      expect(mouseupSpy.mock.calls[0][0].target).toBe(root);
    });

    it('does not dispatch synthetic mouse events when no external overlay is open', async () => {
      const { container } = renderStory({ showToggleSearch: true });
      await expandNode(container, 'admin@example.com');
      await waitFor(() => {
        // Toolbar buttons are always in DOM (isVisible={true}); verify node has rendered
        expect(
          getNodeToolbarButton('admin@example.com', GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID)
        ).not.toBeNull();
      });

      const pane = container.querySelector('.react-flow__pane') as HTMLElement;
      const root = container.querySelector(
        `[data-test-subj="${GRAPH_INVESTIGATION_TEST_ID}"]`
      ) as HTMLElement;

      const mouseupSpy = jest.fn();
      root.addEventListener('mouseup', mouseupSpy);
      try {
        fireEvent.pointerDown(pane, { button: 0, isPrimary: true });
      } finally {
        root.removeEventListener('mouseup', mouseupSpy);
      }

      expect(mouseupSpy).not.toHaveBeenCalled();
    });
  });

  describe('investigateInTimeline', () => {
    describe('entity origins', () => {
      it.each([
        { hasQuery: false, hasNodeFilter: false },
        { hasQuery: false, hasNodeFilter: true },
        { hasQuery: true, hasNodeFilter: false },
        { hasQuery: true, hasNodeFilter: true },
      ])(
        'includes the origin with query=$hasQuery and node filter=$hasNodeFilter',
        async ({ hasQuery, hasNodeFilter }) => {
          const onInvestigateInTimeline = jest.fn<
            void,
            Parameters<NonNullable<GraphInvestigationProps['onInvestigateInTimeline']>>
          >();
          const timeRange = { from: 'now-30d', to: 'now' };
          const { getByTestId, container } = renderStory({
            onInvestigateInTimeline,
            showInvestigateInTimeline: true,
            initialState: {
              dataView: mockDataView,
              entityIds: [{ id: 'admin@example.com', isOrigin: true }],
              timeRange,
            },
          });

          if (hasNodeFilter) {
            await showActionsByNode(container, 'admin@example.com');
          }
          if (hasQuery) {
            fireEvent.change(getByTestId('queryInput'), {
              target: { value: 'host.name: server' },
            });
            getByTestId('querySubmitButton').click();
          }

          const graphRequest: UseFetchGraphDataParams = JSON.parse(
            actionMocks[USE_FETCH_GRAPH_DATA_ACTION].mock.calls.at(-1)?.[0]
          );
          getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

          expect(onInvestigateInTimeline).toHaveBeenCalledTimes(1);
          const [query, filters, actualTimeRange] = onInvestigateInTimeline.mock.calls[0];
          expect(query).toEqual({ language: 'kuery', query: '' });
          expect(actualTimeRange).toEqual(timeRange);
          const filterDsl = JSON.stringify(
            buildEsQuery(mockDataView, query ? [query] : [], filters)
          );
          expect(filterDsl).toContain('user.email');
          expect(filterDsl).toContain('user.target.email');
          expect(filterDsl).toContain('admin@example.com');
          expect(filterDsl).not.toContain('entity.id');
          if (hasQuery) {
            expect(filterDsl).toContain('host.name');
            expect(filterDsl).toContain('server');
          }
          const [combinedFilter] = filters;
          if (!isCombinedFilter(combinedFilter)) {
            throw new Error('Expected a combined Timeline origin filter');
          }
          expect(combinedFilter.meta.params).toHaveLength(hasQuery || hasNodeFilter ? 2 : 1);
          expect(combinedFilter.meta.relation).toBe('OR');
          if (hasQuery) {
            // Keep the graph's complete query-and-filters branch together when ORing the origin.
            expect(combinedFilter.meta.params[1]).toMatchObject(
              graphRequest.req.query.esQuery ?? {}
            );
          } else if (hasNodeFilter) {
            expect(combinedFilter.meta.params[1]).toMatchObject({ meta: { relation: 'AND' } });
          }
          expect(
            within(container).queryAllByRole('button', { name: 'Filter actions' })
          ).toHaveLength(hasNodeFilter ? 1 : 0);
        }
      );

      it('includes all origin entities and excludes expanded entities', () => {
        const onInvestigateInTimeline = jest.fn();
        const { getByTestId } = renderStory({
          onInvestigateInTimeline,
          showInvestigateInTimeline: true,
          initialState: {
            dataView: mockDataView,
            entityIds: [
              { id: 'admin@example.com', isOrigin: true },
              { id: 'projects/your-project-id/roles/customRole', isOrigin: true },
              { id: 'user:expanded', isOrigin: false },
            ],
            timeRange: { from: 'now-30d', to: 'now' },
          },
        });

        getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

        const filters = onInvestigateInTimeline.mock.calls[0][FILTERS_PARAM_IDX];
        expect(filters[0].meta.params).toHaveLength(2);
        const filterDsl = JSON.stringify(buildEsQuery(mockDataView, [], filters));
        expect(filterDsl).toContain('admin@example.com');
        expect(filterDsl).toContain('projects/your-project-id/roles/customRole');
        expect(filterDsl).not.toContain('user:expanded');
      });

      it('preserves disabled filters without adding their events to the origin search', async () => {
        const onInvestigateInTimeline = jest.fn();
        const { getByTestId, container } = renderStory({
          onInvestigateInTimeline,
          showInvestigateInTimeline: true,
          initialState: {
            dataView: mockDataView,
            entityIds: [{ id: 'projects/your-project-id/roles/customRole', isOrigin: true }],
            timeRange: { from: 'now-30d', to: 'now' },
          },
        });
        await showActionsByNode(container, 'admin@example.com');
        disableFilter(container, 0);

        getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

        const filters = onInvestigateInTimeline.mock.calls[0][FILTERS_PARAM_IDX];
        expect(filters).toHaveLength(2);
        expect(filters[1].meta.disabled).toBe(true);
        const filterDsl = JSON.stringify(buildEsQuery(mockDataView, [], filters));
        expect(filterDsl).toContain('projects/your-project-id/roles/customRole');
        expect(filterDsl).not.toContain('admin@example.com');
      });

      it('does not open an unfiltered Timeline when origin source fields are unavailable', () => {
        const onInvestigateInTimeline = jest.fn();
        const { getByTestId } = renderStory({
          onInvestigateInTimeline,
          showInvestigateInTimeline: true,
          initialState: {
            dataView: mockDataView,
            entityIds: [{ id: 'host:unavailable', isOrigin: true }],
            timeRange: { from: 'now-30d', to: 'now' },
          },
        });

        expect(getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID)).toBeDisabled();
        getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();
        expect(onInvestigateInTimeline).not.toHaveBeenCalled();
      });
    });

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
      fireEvent.change(queryInput, { target: { value: 'host1' } });
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
      await showActionsByNode(container, entityIdFilter);
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
                  field: 'user.email',
                  index: '1235',
                  key: 'user.email',
                  negate: false,
                  params: {
                    query: entityIdFilter,
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.email': entityIdFilter,
                  },
                },
              },
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'user.name',
                  index: '1235',
                  key: 'user.name',
                  negate: false,
                  params: {
                    query: 'admin',
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.name': 'admin',
                  },
                },
              },
              ...['1', '2'].map((eventId) => ({
                meta: {
                  controlledBy: 'graph-investigation',
                  disabled: false,
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
      await showActionsByNode(container, entityIdFilter);
      const queryInput = getByTestId('queryInput');
      fireEvent.change(queryInput, { target: { value: 'host1' } });
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
                  field: 'user.email',
                  index: '1235',
                  key: 'user.email',
                  negate: false,
                  params: {
                    query: entityIdFilter,
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.email': entityIdFilter,
                  },
                },
              },
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'user.name',
                  index: '1235',
                  key: 'user.name',
                  negate: false,
                  params: {
                    query: 'admin',
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.name': 'admin',
                  },
                },
              },
              ...['1', '2'].map((eventId) => ({
                meta: {
                  controlledBy: 'graph-investigation',
                  disabled: false,
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
      fireEvent.change(queryInput, { target: { value: 'host1' } });
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
      await showActionsByNode(container, entityIdFilter);
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
            params: [
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'user.email',
                  index: '1235',
                  key: 'user.email',
                  negate: false,
                  params: {
                    query: entityIdFilter,
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.email': entityIdFilter,
                  },
                },
              },
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'user.name',
                  index: '1235',
                  key: 'user.name',
                  negate: false,
                  params: {
                    query: 'admin',
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.name': 'admin',
                  },
                },
              },
            ],
            type: 'combined',
            relation: 'OR',
          }),
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
      await showActionsByNode(container, entityIdFilter);
      const queryInput = getByTestId('queryInput');
      fireEvent.change(queryInput, { target: { value: 'host1' } });
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
            params: [
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'user.email',
                  index: '1235',
                  key: 'user.email',
                  negate: false,
                  params: {
                    query: entityIdFilter,
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.email': entityIdFilter,
                  },
                },
              },
              {
                meta: {
                  controlledBy: 'graph-investigation',
                  field: 'user.name',
                  index: '1235',
                  key: 'user.name',
                  negate: false,
                  params: {
                    query: 'admin',
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'user.name': 'admin',
                  },
                },
              },
            ],
            type: 'combined',
            relation: 'OR',
          }),
        },
      ]);
    });
  });

  describe('grouped-actor scenario - mixed namespaces as actor', () => {
    it('renders graph with grouped actor node', async () => {
      const { container } = renderGroupedActorStory();

      await waitFor(() => {
        const nodes = container.querySelectorAll('.react-flow__nodes .react-flow__node');
        expect(nodes).toHaveLength(4); // group, grouped-actor, target, label
      });
    });

    it('grouped actor node with mixed namespaces falls back to generic entity.id filter', async () => {
      const onInvestigateInTimeline = jest.fn();
      const { container } = renderGroupedActorStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
      });

      // Since the node has no entity details (all availableInEntityStore = false),
      // we cannot add filters via "Show actions by entity"
      // This scenario tests the fallback behavior
      await waitFor(() => {
        const nodeElement = container.querySelector(
          `.react-flow__nodes .react-flow__node[data-id="mixed-entities"]`
        );
        expect(nodeElement).not.toBeNull();
      });
    });

    it('grouped actor node does not show filter actions in popover', async () => {
      const { container } = renderGroupedActorStory();
      const nodeId = 'mixed-entities';

      await expandNode(container, nodeId);

      // Grouped entities should not have "Show actions by entity" option
      const showActionsBy = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID
      );
      expect(showActionsBy).toBeNull();
    });

    it('grouped actor node shows grouped entities option', async () => {
      const { container } = renderGroupedActorStory();
      const nodeId = 'mixed-entities';

      await expandNode(container, nodeId);

      const showDetailsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_GROUPED_ENTITIES_ITEM_ID
      );
      expect(showDetailsItem).not.toBeNull();
      expect(showDetailsItem).toHaveAttribute('aria-label', 'Show grouped entities');
    });
  });

  describe('grouped-target scenario - mixed namespaces as target', () => {
    it('renders graph with grouped target node', async () => {
      const { container } = renderGroupedTargetStory();

      await waitFor(() => {
        const nodes = container.querySelectorAll('.react-flow__nodes .react-flow__node');
        expect(nodes).toHaveLength(4); // group, actor, grouped-target, label
      });
    });

    it('single actor node uses sourceFields for filters', async () => {
      const onInvestigateInTimeline = jest.fn();
      const { container, getByTestId } = renderGroupedTargetStory({
        onInvestigateInTimeline,
        showInvestigateInTimeline: true,
      });

      // Act - Click "Show actions by entity" on single-actor node
      await showActionsByNode(container, 'single-actor');
      getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID).click();

      // Assert - Should use sourceFields (user.id, user.email, user.name) as OR combined filter
      expect(onInvestigateInTimeline).toHaveBeenCalled();
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
            params: expect.arrayContaining([
              expect.objectContaining({
                meta: expect.objectContaining({
                  field: 'user.id',
                  key: 'user.id',
                }),
                query: {
                  match_phrase: {
                    'user.id': 'single-actor',
                  },
                },
              }),
              expect.objectContaining({
                meta: expect.objectContaining({
                  field: 'user.email',
                  key: 'user.email',
                }),
                query: {
                  match_phrase: {
                    'user.email': 'actor@example.com',
                  },
                },
              }),
            ]),
            type: 'combined',
            relation: 'OR',
          }),
        },
      ]);
    });

    it('grouped target node with mixed namespaces does not show filter actions in popover', async () => {
      const { container } = renderGroupedTargetStory();
      const nodeId = 'mixed-targets';

      await expandNode(container, nodeId);

      // Grouped entities should not have "Show actions by entity" or "Show actions on entity" options
      const showActionsBy = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID
      );
      expect(showActionsBy).toBeNull();
    });

    it('grouped target node shows grouped entities option', async () => {
      const { container } = renderGroupedTargetStory();
      const nodeId = 'mixed-targets';

      await expandNode(container, nodeId);

      const showDetailsItem = getNodeToolbarButton(
        nodeId,
        GRAPH_NODE_POPOVER_SHOW_GROUPED_ENTITIES_ITEM_ID
      );
      expect(showDetailsItem).not.toBeNull();
      expect(showDetailsItem).toHaveAttribute('aria-label', 'Show grouped entities');
    });
  });
});
