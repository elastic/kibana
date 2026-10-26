/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { setProjectAnnotations, composeStories } from '@storybook/react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import * as stories from './graph_investigation.stories';
import type { GraphInvestigationProps } from './graph_investigation';
import { GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID } from '../test_ids';
import * as previewAnnotations from '../../../.storybook/preview';

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

jest.mock('../../hooks/use_fetch_graph_data', () => {
  return require('../mock/use_fetch_graph_data.mock');
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
});
