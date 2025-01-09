/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type Meta, Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { GraphInvestigation, type GraphInvestigationProps } from './graph_investigation';
import {
  KibanaReactStorybookDecorator,
  ReactQueryStorybookDecorator,
} from '../../../.storybook/decorators';
import { mockDataView } from '../mock/data_view.mock';
import { SHOW_SEARCH_BAR_BUTTON_TOUR_STORAGE_KEY } from '../../common/constants';

export default {
  title: 'Components/Graph Components/Investigation',
  description: 'CDR - Graph visualization',
  argTypes: {
    showToggleSearch: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
    showInvestigateInTimeline: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
    shouldShowSearchBarTour: {
      description: 'Toggle the button to set the initial state of showing search bar tour',
      control: { type: 'boolean' },
      defaultValue: true,
    },
  },
  decorators: [
    ReactQueryStorybookDecorator,
    KibanaReactStorybookDecorator,
    (StoryComponent, context) => {
      const { shouldShowSearchBarTour } = context.args;
      localStorage.setItem(SHOW_SEARCH_BAR_BUTTON_TOUR_STORAGE_KEY, shouldShowSearchBarTour);
      return <StoryComponent />;
    },
  ],
} as Meta;

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

const Template: Story<Partial<GraphInvestigationProps>> = (props) => {
  return <GraphInvestigation {...defaultProps} {...props} />;
};

export const Investigation = Template.bind({});
