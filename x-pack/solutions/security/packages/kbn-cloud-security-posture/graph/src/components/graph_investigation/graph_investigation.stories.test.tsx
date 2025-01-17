/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setProjectAnnotations } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { composeStories } from '@storybook/testing-react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import * as stories from './graph_investigation.stories';
import { type GraphInvestigationProps } from './graph_investigation';
import { GRAPH_INVESTIGATION_TEST_ID, GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID } from '../test_ids';
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

const QUERY_PARAM_IDX = 0;
const FILTERS_PARAM_IDX = 1;

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
        meta: {
          disabled: false,
          index: '1235',
          negate: false,
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
        },
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
        meta: {
          disabled: false,
          index: '1235',
          negate: false,
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
        },
      },
    ]);
  });
});
