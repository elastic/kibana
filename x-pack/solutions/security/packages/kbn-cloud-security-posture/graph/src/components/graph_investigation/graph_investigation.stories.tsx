/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj, Decorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { GraphInvestigation, type GraphInvestigationProps } from './graph_investigation';
import {
  KibanaReactStorybookDecorator,
  ReactQueryStorybookDecorator,
  GlobalStylesStorybookDecorator,
} from '../../../.storybook/decorators';
import { mockDataView } from '../mock/data_view.mock';
import { SHOW_SEARCH_BAR_BUTTON_TOUR_STORAGE_KEY } from '../../common/constants';
import { MockDataProvider } from '../mock/mock_context_provider';
import {
  USE_FETCH_GRAPH_DATA_ACTION,
  USE_FETCH_GRAPH_DATA_REFRESH_ACTION,
} from '../mock/constants';
import {
  singleActorMockData,
  groupedActorMockData,
  groupedTargetMockData,
} from '../mock/use_fetch_graph_data.mock';

const hourAgo = new Date(new Date().getTime() - 60 * 60 * 1000);
const defaultProps: GraphInvestigationProps = {
  initialState: {
    dataView: mockDataView,
    originEventIds: [
      {
        id: '1',
        isAlert: false,
      },
      {
        id: '2',
        isAlert: true,
      },
    ],
    timeRange: {
      from: `${hourAgo.toISOString()}||-15m`,
      to: `${hourAgo.toISOString()}||+15m`,
    },
  },
  onInvestigateInTimeline: action('onInvestigateInTimeline'),
  showToggleSearch: false,
  showInvestigateInTimeline: false,
};

type GraphInvestigationPropsAndCustomArgs = React.ComponentProps<typeof GraphInvestigation> & {
  shouldShowSearchBarTour: boolean;
  isLoading: boolean;
  supportNodePreviewPopover: boolean;
};

const createDecorator = (mockData: unknown): Decorator[] => {
  const scenarioDecorator: Decorator = (StoryComponent, context) => {
    const { shouldShowSearchBarTour, isLoading } =
      context.args as Partial<GraphInvestigationPropsAndCustomArgs>;
    localStorage.setItem(
      SHOW_SEARCH_BAR_BUTTON_TOUR_STORAGE_KEY,
      shouldShowSearchBarTour?.toString() || 'true'
    );
    const mock = {
      useFetchGraphDataMock: {
        isFetching: isLoading ?? false,
        refresh: action(USE_FETCH_GRAPH_DATA_REFRESH_ACTION),
        log: action(USE_FETCH_GRAPH_DATA_ACTION),
        data: mockData,
      },
    };

    return (
      <MockDataProvider data={mock}>
        <StoryComponent />
      </MockDataProvider>
    );
  };

  return [
    ReactQueryStorybookDecorator,
    KibanaReactStorybookDecorator,
    GlobalStylesStorybookDecorator,
    scenarioDecorator,
  ];
};

const meta = {
  title: 'Components/Graph Components/Investigation',
  render: (props: Partial<GraphInvestigationPropsAndCustomArgs>) => {
    return (
      <GraphInvestigation
        {...defaultProps}
        {...props}
        {...(props.supportNodePreviewPopover
          ? {
              onOpenEventPreview: action('onOpenEventPreview'),
              onOpenNetworkPreview: action('onOpenNetworkPreview'),
            }
          : {})}
      />
    );
  },
  argTypes: {
    showToggleSearch: {
      control: { type: 'boolean' },
    },
    showInvestigateInTimeline: {
      control: { type: 'boolean' },
    },
    shouldShowSearchBarTour: {
      description: 'Toggle the button to set the initial state of showing search bar tour',
      control: { type: 'boolean' },
    },
    isLoading: {
      control: { type: 'boolean' },
    },
    supportNodePreviewPopover: {
      control: { type: 'boolean' },
      description:
        'Enable or disable the support for node preview popover (When disabled `Show event details` list item is not shown)',
    },
  },
  args: {
    showToggleSearch: false,
    showInvestigateInTimeline: false,
    shouldShowSearchBarTour: true,
    isLoading: false,
    supportNodePreviewPopover: true,
  },
} satisfies Meta<Partial<GraphInvestigationPropsAndCustomArgs>>;

export default meta;

export const SingleActor: StoryObj<Partial<GraphInvestigationProps>> = {
  decorators: createDecorator(singleActorMockData),
};

export const GroupedActor: StoryObj<Partial<GraphInvestigationProps>> = {
  decorators: createDecorator(groupedActorMockData),
};

export const GroupedTarget: StoryObj<Partial<GraphInvestigationProps>> = {
  decorators: createDecorator(groupedTargetMockData),
};
