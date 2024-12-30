/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { action } from '@storybook/addon-actions';
import { GraphInvestigation, type GraphInvestigationProps } from './graph_investigation';
import {
  KibanaReactStorybookDecorator,
  ReactQueryStorybookDecorator,
  SecuritySolutionStorybookDecorator,
} from '../../../../.storybook/decorators';

export default {
  title: 'Components/Graph Components/Investigation',
  description: 'CDR - Graph visualization',
  argTypes: {},
  decorators: [
    SecuritySolutionStorybookDecorator,
    ReactQueryStorybookDecorator,
    KibanaReactStorybookDecorator,
  ],
};

const mockDataView = {
  id: '1235',
  title: 'test-*',
  fields: [
    {
      name: 'actor.entity.id',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'target.entity.id',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'related.entity',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'event.action',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
  getName: () => 'test-*',
} as DataView;

const hourAgo = new Date(new Date().getTime() - 60 * 60 * 1000);

const Template: Story = (
  props: Pick<GraphInvestigationProps, 'showToggleSearch' | 'showInvestigateInTimeline'>
) => {
  return (
    <GraphInvestigation
      initialState={{
        dataView: mockDataView,
        originEventIds: [
          {
            id: '1',
            isAlert: false,
          },
        ],
        timeRange: {
          from: `${hourAgo.toISOString()}||-15m`,
          to: `${hourAgo.toISOString()}||+15m`,
        },
      }}
      onInvestigateInTimeline={action('onInvestigateInTimeline')}
      {...props}
    />
  );
};

export const Investigation = Template.bind({});

Investigation.args = {
  showToggleSearch: false,
  showInvestigateInTimeline: false,
};
