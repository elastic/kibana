/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { setProjectAnnotations, composeStories } from '@storybook/react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import * as stories from './graph_investigation.stories';
import { GraphInvestigation } from './graph_investigation';
import type { GraphInvestigationProps } from './graph_investigation';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_GROUPED_ENTITIES_ITEM_ID,
} from '../test_ids';
import * as previewAnnotations from '../../../.storybook/preview';
import {
  KibanaReactStorybookDecorator,
  ReactQueryStorybookDecorator,
} from '../../../.storybook/decorators';
import { mockDataView } from '../mock/data_view.mock';
import { MockDataProvider } from '../mock/mock_context_provider';
import { groupedActorMockData, singleActorMockData } from '../mock/use_fetch_graph_data.mock';
import type { GraphTelemetryEvent } from '../graph_telemetry';
import { GraphFetchError } from '../../hooks/graph_fetch_error';

setProjectAnnotations(previewAnnotations);

const { SingleActor } = composeStories(stories);

interface MockSearchBarProps {
  onFiltersUpdated: (filters: Filter[]) => void;
  onQuerySubmit: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
}

let mockSearchBarProps: MockSearchBarProps | undefined;

// The real SearchBar is hard to drive in jsdom; capture its props so the test can invoke the
// callbacks GraphInvestigation passes to it.
jest.mock('@kbn/unified-search-plugin/public', () => ({
  ...jest.requireActual('@kbn/unified-search-plugin/public'),
  SearchBar: (props: MockSearchBarProps) => {
    mockSearchBarProps = props;
    return null;
  },
}));

// The shared mock falls back to default data when `data` is undefined; this flag lets a test
// simulate the state before the first load completes.
let mockHideFetchedData = false;

jest.mock('../../hooks/use_fetch_graph_data', () => {
  const fetchMock = jest.requireActual('../mock/use_fetch_graph_data.mock');
  return {
    ...fetchMock,
    useFetchGraphData: (params: unknown) => {
      const result = fetchMock.useFetchGraphData(params);
      return mockHideFetchedData ? { ...result, data: undefined } : result;
    },
  };
});

jest.mock('@storybook/addon-actions', () => ({
  action: jest.fn(() => jest.fn()),
}));

// Turn off the optimization that hides elements that are not visible in the viewport
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn().mockReturnValue([true, jest.fn()]));

const renderStory = (args: Partial<GraphInvestigationProps> = {}) =>
  render(
    <IntlProvider locale="en">
      <SingleActor {...args} />
    </IntlProvider>,
    { legacyRoot: true }
  );

interface FetchState {
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
  data?: unknown;
}

interface HarnessState {
  fetchState: FetchState;
  props: GraphInvestigationProps;
}

const HarnessContext = createContext<HarnessState | undefined>(undefined);

const GraphUnderTest = () => {
  const harness = useContext(HarnessContext);
  const mock = useMemo(() => ({ useFetchGraphDataMock: harness?.fetchState }), [harness]);
  return harness ? (
    <MockDataProvider data={mock}>
      <GraphInvestigation {...harness.props} />
    </MockDataProvider>
  ) : null;
};

// The decorators create a new context provider on every call; memoize them so a re-render updates
// GraphInvestigation (through HarnessContext) instead of remounting it.
const GraphWithKibana = () => useMemo(() => KibanaReactStorybookDecorator(GraphUnderTest), []);
const GraphWithProviders = () => useMemo(() => ReactQueryStorybookDecorator(GraphWithKibana), []);

let scopeCounter = 0;

// Renders GraphInvestigation against a controllable useFetchGraphData mock. The returned
// `setFetchState` re-renders it with a new fetch state, the way a React Query refetch would.
const renderGraph = (
  initialFetchState: FetchState,
  { onTelemetryEvent }: { onTelemetryEvent?: (event: GraphTelemetryEvent) => void } = {}
) => {
  scopeCounter += 1;
  const props: GraphInvestigationProps = {
    // Filter state is shared per scope, so every render gets its own.
    scopeId: `expansion-results-${scopeCounter}`,
    initialState: {
      dataView: mockDataView,
      originEventIds: [{ id: '1', isAlert: false }],
      timeRange: { from: 'now-75m', to: 'now-45m' },
    },
    onOpenEventPreview: jest.fn(),
    onTelemetryEvent,
  };
  const ui = (fetchState: FetchState) => (
    <IntlProvider locale="en">
      <HarnessContext.Provider value={{ fetchState, props }}>
        <GraphWithProviders />
      </HarnessContext.Provider>
    </IntlProvider>
  );
  const { container, rerender } = render(ui(initialFetchState), { legacyRoot: true });

  return {
    container,
    setFetchState: (fetchState: FetchState) => rerender(ui(fetchState)),
  };
};

const withExtraNodes = (ids: string[]) => ({
  ...singleActorMockData,
  nodes: [
    ...singleActorMockData.nodes,
    ...ids.map((id) => ({ ...singleActorMockData.nodes[1], id })),
  ],
});

// Mimics the server answering with the same graph under regenerated ids (`unknown-<uuid>` target
// ids and group hashes change on every response), plus `extraNodeCount` additional nodes.
const withRegeneratedIds = (uuid: string, extraNodeCount = 0) => {
  const regeneratedId = (id: string) => `unknown-${uuid}-${id}`;
  return {
    ...singleActorMockData,
    nodes: [
      ...singleActorMockData.nodes.map((node) => ({
        ...node,
        id: regeneratedId(node.id),
        ...('parentId' in node && typeof node.parentId === 'string'
          ? { parentId: regeneratedId(node.parentId) }
          : {}),
      })),
      ...Array.from({ length: extraNodeCount }, (_, index) => ({
        ...singleActorMockData.nodes[1],
        id: `unknown-${uuid}-extra-${index}`,
      })),
    ],
    edges: singleActorMockData.edges.map((edge) => ({
      ...edge,
      id: regeneratedId(edge.id),
      source: regeneratedId(edge.source),
      target: regeneratedId(edge.target),
    })),
  };
};

const withOnlyEntityNodes = {
  ...singleActorMockData,
  nodes: singleActorMockData.nodes.slice(1, 3),
  edges: [],
};

const ACTOR_NODE_ID = 'admin@example.com';
const ENRICHED_ENTITY_NODE_ID = 'projects/your-project-id/roles/customRole';

const clickNodeAction = async (container: HTMLElement, nodeId: string, testId: string) => {
  const nodeSelector = `.react-flow__nodes .react-flow__node[data-id="${nodeId}"]`;
  await waitFor(() => expect(container.querySelector(nodeSelector)).not.toBeNull());
  const nodeElement = container.querySelector<HTMLElement>(nodeSelector)!;
  userEvent.hover(nodeElement);
  fireEvent.click(within(nodeElement).getByTestId(testId));
};

const getExpansionResults = (onTelemetryEvent: jest.Mock) =>
  onTelemetryEvent.mock.calls
    .map(([event]) => event as GraphTelemetryEvent)
    .filter(({ type }) => type === 'expansion_result');

const getEmptyStates = (onTelemetryEvent: jest.Mock) =>
  onTelemetryEvent.mock.calls
    .map(([event]) => event as GraphTelemetryEvent)
    .filter(({ type }) => type === 'empty_state_shown');

const getFetchFailures = (onTelemetryEvent: jest.Mock) =>
  onTelemetryEvent.mock.calls
    .map(([event]) => event as GraphTelemetryEvent)
    .filter(({ type }) => type === 'fetch_failed');

const emptyGraphData = { ...singleActorMockData, nodes: [], edges: [] };

const createFilter = (key: string): Filter => ({
  meta: { key },
  query: { match_phrase: { [key]: 'value' } },
});

const getSearchBarProps = (): MockSearchBarProps => {
  expect(mockSearchBarProps).toBeDefined();
  return mockSearchBarProps!;
};

describe('GraphInvestigation telemetry', () => {
  beforeEach(() => {
    mockSearchBarProps = undefined;
    mockHideFetchedData = false;
  });

  describe('search bar', () => {
    it('reports a filter added through the search bar, then removed', async () => {
      const onTelemetryEvent = jest.fn();
      renderStory({ onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      act(() => getSearchBarProps().onFiltersUpdated([createFilter('user.name')]));
      expect(onTelemetryEvent).toHaveBeenLastCalledWith({
        type: 'filter_changed',
        change: 'added',
      });

      act(() => getSearchBarProps().onFiltersUpdated([]));
      expect(onTelemetryEvent).toHaveBeenLastCalledWith({
        type: 'filter_changed',
        change: 'removed',
      });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(2);
    });

    it('reports a time range change against the previous time range', async () => {
      const onTelemetryEvent = jest.fn();
      renderStory({ onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      act(() =>
        getSearchBarProps().onQuerySubmit(
          {
            dateRange: { from: 'now-7d', to: 'now' },
            query: { query: '', language: 'kuery' },
          },
          true
        )
      );

      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);
      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'search_submitted',
        timeRangeChanged: true,
        queryChanged: false,
      });
    });

    it('reports a query change against the previous query', async () => {
      const onTelemetryEvent = jest.fn();
      renderStory({ onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      // Same time range as the story's initial state, so only the query differs.
      act(() =>
        getSearchBarProps().onQuerySubmit(
          {
            dateRange: { from: 'now-75m', to: 'now-45m' },
            query: { query: 'user.name: "alice"', language: 'kuery' },
          },
          true
        )
      );

      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'search_submitted',
        timeRangeChanged: false,
        queryChanged: true,
      });
    });

    it('reports nothing when the search bar only refreshes', async () => {
      const onTelemetryEvent = jest.fn();
      renderStory({ onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      act(() =>
        getSearchBarProps().onQuerySubmit(
          { dateRange: { from: 'now-7d', to: 'now' }, query: { query: 'x', language: 'kuery' } },
          false
        )
      );

      expect(onTelemetryEvent).not.toHaveBeenCalled();
    });

    it('does not throw when onTelemetryEvent is omitted', async () => {
      renderStory();
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      expect(() => {
        act(() => getSearchBarProps().onFiltersUpdated([createFilter('user.name')]));
        act(() =>
          getSearchBarProps().onQuerySubmit(
            { dateRange: { from: 'now-7d', to: 'now' }, query: { query: 'x', language: 'kuery' } },
            true
          )
        );
      }).not.toThrow();
    });
  });

  describe('node popovers', () => {
    it('passes onTelemetryEvent through to the entity node popover actions', async () => {
      const onTelemetryEvent = jest.fn();
      const { container } = renderStory({ onTelemetryEvent });

      const nodeSelector = '.react-flow__nodes .react-flow__node[data-id="admin@example.com"]';
      await waitFor(() => expect(container.querySelector(nodeSelector)).not.toBeNull());
      const nodeElement = container.querySelector<HTMLElement>(nodeSelector)!;
      userEvent.hover(nodeElement);

      fireEvent.click(within(nodeElement).getByTestId(GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID));

      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'entity',
        action: 'show_actions_by',
        state: 'show',
      });
    });
  });

  describe('expansion results', () => {
    it('reports an expansion that added nodes once the fetch completes', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1', 'extra-2']) }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        {
          type: 'expansion_result',
          action: 'show_actions_by',
          nodeType: 'entity',
          state: 'show',
          nodesAdded: true,
          nodesLimitReached: false,
        },
      ]);
    });

    it('reports no added nodes when a hide toggle removes nodes', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      const expanded = withExtraNodes(['extra-1']);
      act(() => setFetchState({ isFetching: false, data: expanded }));
      onTelemetryEvent.mockClear();

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: expanded }));
      act(() => setFetchState({ isFetching: false, data: withOnlyEntityNodes }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        {
          type: 'expansion_result',
          action: 'show_actions_by',
          nodeType: 'entity',
          state: 'hide',
          nodesAdded: false,
          nodesLimitReached: false,
        },
      ]);
    });

    it('reports no added nodes when the fetch returns the same number of nodes', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: { ...singleActorMockData } }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        expect.objectContaining({ nodesAdded: false, nodesLimitReached: false }),
      ]);
    });

    it('reports no added nodes when every id changes but the number of nodes does not', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withRegeneratedIds('3f2a9c1e') }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        expect.objectContaining({ nodesAdded: false }),
      ]);
    });

    it('reports added nodes when one more node is returned even if other ids changed', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withRegeneratedIds('7b81d4f0', 1) }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        expect.objectContaining({ nodesAdded: true }),
      ]);
    });

    it('reports when the server reached the nodes limit', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() =>
        setFetchState({
          isFetching: false,
          data: {
            ...withExtraNodes(['extra-1']),
            messages: ['REACHED_NODES_LIMIT', 'REACHED_NODES_LIMIT'],
          },
        })
      );

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        expect.objectContaining({ nodesAdded: true, nodesLimitReached: true }),
      ]);
    });

    it('reports nothing while the graph is still fetching', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: true, data: withExtraNodes(['extra-1']) }));

      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(0);

      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));

      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(1);
    });

    it('reports an expansion clicked while a refetch is already in flight', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { isFetching: true, data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      // The fetch keeps running through the query key change, so no idle-to-fetching transition.
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1', 'extra-2']) }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        {
          type: 'expansion_result',
          action: 'show_actions_by',
          nodeType: 'entity',
          state: 'show',
          nodesAdded: true,
          nodesLimitReached: false,
        },
      ]);
    });

    it('reports no added nodes when the in-flight refetch returns the same number of nodes', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { isFetching: true, data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: false, data: { ...singleActorMockData } }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        expect.objectContaining({ nodesAdded: false, nodesLimitReached: false }),
      ]);
    });

    it('does not attribute a later refetch to an expansion clicked during an in-flight refetch', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { isFetching: true, data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));
      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(1);

      act(() => setFetchState({ isFetching: true, data: withExtraNodes(['extra-1']) }));
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1', 'extra-2']) }));

      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(1);
    });

    it('reports nothing for the show details action', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(
        container,
        ENRICHED_ENTITY_NODE_ID,
        GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));

      expect(onTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'node_action', action: 'show_details' })
      );
      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing for the grouped entities action', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: groupedActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(
        container,
        'mixed-entities',
        GRAPH_NODE_POPOVER_SHOW_GROUPED_ENTITIES_ITEM_ID
      );
      act(() => setFetchState({ isFetching: true, data: groupedActorMockData }));
      act(() =>
        setFetchState({
          isFetching: false,
          data: {
            ...groupedActorMockData,
            nodes: [
              ...groupedActorMockData.nodes,
              { ...groupedActorMockData.nodes[2], id: 'extra-1' },
            ],
          },
        })
      );

      expect(onTelemetryEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'node_action', action: 'show_grouped_entities' })
      );
      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports one result for the latest action when toggles overlap', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        {
          type: 'expansion_result',
          action: 'show_actions_on',
          nodeType: 'entity',
          state: 'show',
          nodesAdded: true,
          nodesLimitReached: false,
        },
      ]);
    });

    it('compares against the node count from before the first overlapping toggle', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      // Nodes arrive while the fetch is still reported as in flight, then another toggle follows.
      act(() => setFetchState({ isFetching: true, data: withExtraNodes(['extra-1']) }));
      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID);
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));

      expect(getExpansionResults(onTelemetryEvent)).toEqual([
        expect.objectContaining({ action: 'show_actions_on', nodesAdded: true }),
      ]);
    });

    it('reports nothing when the fetch fails', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() =>
        setFetchState({
          isFetching: false,
          isError: true,
          error: new Error('failed'),
          data: singleActorMockData,
        })
      );

      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing when a filter change from the search bar follows the click', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() => getSearchBarProps().onFiltersUpdated([createFilter('user.name')]));
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));

      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing when a search submit follows the click', async () => {
      const onTelemetryEvent = jest.fn();
      const { container, setFetchState } = renderGraph(
        { data: singleActorMockData },
        { onTelemetryEvent }
      );

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      act(() =>
        getSearchBarProps().onQuerySubmit(
          {
            dateRange: { from: 'now-7d', to: 'now' },
            query: { query: '', language: 'kuery' },
          },
          true
        )
      );
      act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
      act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));

      expect(getExpansionResults(onTelemetryEvent)).toHaveLength(0);
    });

    it('does not throw when onTelemetryEvent is omitted', async () => {
      const { container, setFetchState } = renderGraph({ data: singleActorMockData });

      await clickNodeAction(container, ACTOR_NODE_ID, GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID);
      expect(() => {
        act(() => setFetchState({ isFetching: true, data: singleActorMockData }));
        act(() => setFetchState({ isFetching: false, data: withExtraNodes(['extra-1']) }));
      }).not.toThrow();
    });
  });

  describe('empty states', () => {
    it('reports no_data when the loaded graph is empty and nothing is filtered', () => {
      const onTelemetryEvent = jest.fn();
      renderGraph({ data: emptyGraphData }, { onTelemetryEvent });

      expect(getEmptyStates(onTelemetryEvent)).toEqual([
        { type: 'empty_state_shown', emptyReason: 'no_data' },
      ]);
    });

    it('reports no_results_for_filters when a search filter is active', async () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph({ data: singleActorMockData }, { onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      act(() => getSearchBarProps().onFiltersUpdated([createFilter('user.name')]));
      act(() => setFetchState({ data: emptyGraphData }));

      expect(getEmptyStates(onTelemetryEvent)).toEqual([
        { type: 'empty_state_shown', emptyReason: 'no_results_for_filters' },
      ]);
    });

    it('reports no_data when the only search filter is disabled', async () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph({ data: singleActorMockData }, { onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      act(() =>
        getSearchBarProps().onFiltersUpdated([
          { ...createFilter('user.name'), meta: { key: 'user.name', disabled: true } },
        ])
      );
      act(() => setFetchState({ data: emptyGraphData }));

      expect(getEmptyStates(onTelemetryEvent)).toEqual([
        { type: 'empty_state_shown', emptyReason: 'no_data' },
      ]);
    });

    it('reports no_results_for_filters when a KQL query is set', async () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph({ data: singleActorMockData }, { onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      act(() =>
        getSearchBarProps().onQuerySubmit(
          {
            dateRange: { from: 'now-75m', to: 'now-45m' },
            query: { query: 'user.name: "alice"', language: 'kuery' },
          },
          true
        )
      );
      act(() => setFetchState({ data: emptyGraphData }));

      expect(getEmptyStates(onTelemetryEvent)).toEqual([
        { type: 'empty_state_shown', emptyReason: 'no_results_for_filters' },
      ]);
    });

    it('reports no_results_for_filters when the time range was changed', async () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph({ data: singleActorMockData }, { onTelemetryEvent });
      await waitFor(() => expect(mockSearchBarProps).toBeDefined());

      act(() =>
        getSearchBarProps().onQuerySubmit(
          { dateRange: { from: 'now-7d', to: 'now' }, query: { query: '', language: 'kuery' } },
          true
        )
      );
      act(() => setFetchState({ data: emptyGraphData }));

      expect(getEmptyStates(onTelemetryEvent)).toEqual([
        { type: 'empty_state_shown', emptyReason: 'no_results_for_filters' },
      ]);
    });

    it('reports nothing before the first load completes', () => {
      mockHideFetchedData = true;
      const onTelemetryEvent = jest.fn();
      renderGraph({ isFetching: true }, { onTelemetryEvent });

      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing when there is no data yet even though the fetch is idle', () => {
      mockHideFetchedData = true;
      const onTelemetryEvent = jest.fn();

      expect(() =>
        renderGraph({ isFetching: false, isError: false }, { onTelemetryEvent })
      ).not.toThrow();
      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing while the empty graph is being refetched', () => {
      const onTelemetryEvent = jest.fn();
      renderGraph({ isFetching: true, data: emptyGraphData }, { onTelemetryEvent });

      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing when the fetch failed', () => {
      const onTelemetryEvent = jest.fn();
      renderGraph(
        { isError: true, error: new Error('failed'), data: emptyGraphData },
        { onTelemetryEvent }
      );

      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing when the graph has nodes', () => {
      const onTelemetryEvent = jest.fn();
      renderGraph({ data: singleActorMockData }, { onTelemetryEvent });

      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports once when re-rendered with the same empty data', () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph({ data: emptyGraphData }, { onTelemetryEvent });

      act(() => setFetchState({ data: { ...emptyGraphData } }));
      act(() => setFetchState({ data: { ...emptyGraphData } }));

      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(1);
    });

    it('reports again when a refetch completes with an empty graph', () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph({ data: emptyGraphData }, { onTelemetryEvent });

      act(() => setFetchState({ isFetching: true, data: emptyGraphData }));
      act(() => setFetchState({ isFetching: false, data: { ...emptyGraphData } }));

      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(2);
    });

    it('reports again when the graph becomes empty after having nodes', () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph({ data: emptyGraphData }, { onTelemetryEvent });

      act(() => setFetchState({ data: singleActorMockData }));
      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(1);

      act(() => setFetchState({ data: emptyGraphData }));
      expect(getEmptyStates(onTelemetryEvent)).toHaveLength(2);
    });

    it('does not throw when onTelemetryEvent is omitted', () => {
      expect(() => renderGraph({ data: emptyGraphData })).not.toThrow();
    });
  });

  describe('fetch failures', () => {
    it('reports the error category once the fetch failed', () => {
      const onTelemetryEvent = jest.fn();
      renderGraph(
        { isError: true, error: new GraphFetchError('failed', 500), data: undefined },
        { onTelemetryEvent }
      );

      expect(getFetchFailures(onTelemetryEvent)).toEqual([
        { type: 'fetch_failed', errorCategory: 'server_error' },
      ]);
    });

    it('reports unknown for an error that is not a GraphFetchError', () => {
      const onTelemetryEvent = jest.fn();
      renderGraph({ isError: true, error: new Error('failed') }, { onTelemetryEvent });

      expect(getFetchFailures(onTelemetryEvent)).toEqual([
        { type: 'fetch_failed', errorCategory: 'unknown' },
      ]);
    });

    it('reports nothing while a failed fetch is being retried', () => {
      const onTelemetryEvent = jest.fn();
      // React Query keeps `isError` false while retrying, even though the last attempt failed.
      renderGraph(
        {
          isFetching: true,
          isError: false,
          error: new GraphFetchError('failed', 500),
          data: undefined,
        },
        { onTelemetryEvent }
      );

      expect(getFetchFailures(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports nothing when the fetch succeeds', () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph(
        { isFetching: true, data: undefined },
        { onTelemetryEvent }
      );

      act(() => setFetchState({ isFetching: false, data: singleActorMockData }));

      expect(getFetchFailures(onTelemetryEvent)).toHaveLength(0);
    });

    it('reports once when re-rendered with the same error', () => {
      const onTelemetryEvent = jest.fn();
      const error = new GraphFetchError('failed', 500);
      const { setFetchState } = renderGraph({ isError: true, error }, { onTelemetryEvent });

      act(() => setFetchState({ isError: true, error }));
      act(() => setFetchState({ isError: true, error, isFetching: true }));

      expect(getFetchFailures(onTelemetryEvent)).toHaveLength(1);
    });

    it('reports again for a new error', () => {
      const onTelemetryEvent = jest.fn();
      const { setFetchState } = renderGraph(
        { isError: true, error: new GraphFetchError('failed', 500) },
        { onTelemetryEvent }
      );

      act(() => setFetchState({ isError: true, error: new GraphFetchError('failed', 403) }));

      expect(getFetchFailures(onTelemetryEvent)).toEqual([
        { type: 'fetch_failed', errorCategory: 'server_error' },
        { type: 'fetch_failed', errorCategory: 'forbidden' },
      ]);
    });

    it('does not include the error message in the reported event', () => {
      const onTelemetryEvent = jest.fn();
      renderGraph(
        { isError: true, error: new GraphFetchError('secret-index-name leaked', 500) },
        { onTelemetryEvent }
      );

      expect(JSON.stringify(onTelemetryEvent.mock.calls)).not.toContain('secret-index-name');
    });

    it('does not throw when onTelemetryEvent is omitted', () => {
      expect(() =>
        renderGraph({ isError: true, error: new GraphFetchError('failed', 500) })
      ).not.toThrow();
    });
  });
});
