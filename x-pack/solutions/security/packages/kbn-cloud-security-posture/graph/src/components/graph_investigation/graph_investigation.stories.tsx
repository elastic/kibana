/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
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
  decorators: [
    ReactQueryStorybookDecorator,
    KibanaReactStorybookDecorator,
    GlobalStylesStorybookDecorator,
    (StoryComponent, context) => {
      const { shouldShowSearchBarTour, isLoading } = context.args;
      localStorage.setItem(
        SHOW_SEARCH_BAR_BUTTON_TOUR_STORAGE_KEY,
        shouldShowSearchBarTour?.toString() || 'true'
      );
      const mockData = {
        useFetchGraphDataMock: {
          isFetching: isLoading,
          refresh: action(USE_FETCH_GRAPH_DATA_REFRESH_ACTION),
          log: action(USE_FETCH_GRAPH_DATA_ACTION),
        },
      };

      return (
        <MockDataProvider data={mockData}>
          <StoryComponent />
        </MockDataProvider>
      );
    },
  ],
} satisfies Meta<Partial<GraphInvestigationPropsAndCustomArgs>>;

export default meta;
export const Investigation: StoryObj<Partial<GraphInvestigationProps>> = {};
