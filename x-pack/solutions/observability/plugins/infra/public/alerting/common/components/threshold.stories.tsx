/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';
import { LIGHT_THEME } from '@elastic/charts';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { Props, Threshold as Component } from './threshold';

export default {
  component: Component,
  title: 'infra/alerting/Threshold',
  decorators: [
    (Story) => (
      <div
        style={{
          height: '160px',
          width: '240px',
        }}
      >
        {Story()}
      </div>
    ),
  ],
} as ComponentMeta<typeof Component>;

const defaultProps: Props = {
  chartProps: { baseTheme: LIGHT_THEME },
  comparator: COMPARATORS.GREATER_THAN,
  id: 'componentId',
  thresholds: [90],
  title: 'Threshold breached',
  value: 93,
  valueFormatter: (d) => `${d}%`,
  warning: {
    thresholds: [75],
    comparator: COMPARATORS.GREATER_THAN,
  },
};

export const Default = {
  args: {
    ...defaultProps,
  },
};
