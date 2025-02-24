/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { ChangeListProps, ChangeList as Component, ChangeListItemImpact } from './change_list';

export default {
  component: Component,
  title: 'app/Organisms/ChangesList',
};

const Template: ComponentStory<typeof Component> = (props: ChangeListProps) => (
  <div style={{ width: 480 }}>
    <Component {...props} />
  </div>
);

export const ChangeListMetrics = Template.bind({});

ChangeListMetrics.args = {
  title: 'opbeans-java',
  items: [
    {
      label: 'my-host-1',
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100 + (12 - Math.abs(index - 12)) * 10,
        };
      }),
      change: {
        type: 'spike' as const,
        time: 12,
        impact: ChangeListItemImpact.high,
      },
    },
    {
      label: 'my-host-2',
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100 + (12 - Math.abs(index - 12)) * 10,
        };
      }),
      change: {
        type: 'dip' as const,
        time: 9,
        impact: ChangeListItemImpact.medium,
      },
    },
    {
      label: 'my-host-2',
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100 + (12 - Math.abs(index - 12)) * 10,
        };
      }),
      change: {
        type: 'distribution_change' as const,
        time: 14,
        impact: ChangeListItemImpact.low,
      },
    },
    {
      label: 'my-host-3',
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100,
        };
      }),
    },
    {
      label: `2024-04-10T14:32:57.003Z [INFO] [WebServer] Request received - Method: GET, Endpoint: /api/data/fetch, Query: {userId: 42, dataType: 'full'}, IP: 192.168.1.25, UserAgent: Mozilla/5`,
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100,
        };
      }),
    },
  ],
};

export const ChangeListLogs = Template.bind({});

ChangeListLogs.args = {
  title: 'opbeans-java',
  items: [
    {
      label: 'my-host-1',
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100 + (12 - Math.abs(index - 12)) * 10,
        };
      }),
      change: {
        type: 'spike' as const,
        time: 12,
        impact: ChangeListItemImpact.high,
      },
    },
    {
      label: 'my-host-2',
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100 + (12 - Math.abs(index - 12)) * 10,
        };
      }),
      change: {
        type: 'dip' as const,
        time: 9,
        impact: ChangeListItemImpact.medium,
      },
    },
    {
      label: 'my-host-2',
      timeseries: new Array(25).fill(undefined).map((_, index) => {
        return {
          x: index,
          y: 100 + (12 - Math.abs(index - 12)) * 10,
        };
      }),
      change: {
        type: 'distribution_change' as const,
        time: 14,
        impact: ChangeListItemImpact.low,
      },
    },
  ],
};
