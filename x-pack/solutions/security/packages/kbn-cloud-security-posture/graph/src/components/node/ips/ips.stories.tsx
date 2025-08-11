/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { Ips as IpsComponent, type IpsProps } from './ips';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta<IpsProps> = {
  title: 'Components/Graph Components/Additional Components',
  args: {
    ips: [
      '10.200.0.202',
      '192.14.29.80',
      '192.14.29.80',
      '74.25.14.20',
      '192.14.29.80',
      '10.200.0.202',
    ],
  },
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const Template: StoryFn<IpsProps> = (props: IpsProps) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <IpsComponent {...props} />
  </ThemeProvider>
);

export const Ips: StoryObj<IpsProps> = {
  render: Template,
};
