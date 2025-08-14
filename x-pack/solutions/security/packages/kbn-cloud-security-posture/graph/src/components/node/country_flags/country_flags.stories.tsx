/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { CountryFlags as CountryFlagsComponent, type CountryFlagsProps } from './country_flags';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta<CountryFlagsProps> = {
  title: 'Components/Graph Components/Additional Components',
  args: {
    countryCodes: [
      'US',
      'INVALID_CODE',
      '',
      null as unknown as string,
      'RU',
      'ES',
      'US',
      'US',
      'IL',
      'IT',
      'DE',
      'FR',
      'GR',
      'BR',
      'AR',
      'PT',
      'NO',
    ],
  },
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const Template: StoryFn<CountryFlagsProps> = (props: CountryFlagsProps) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <CountryFlagsComponent {...props} />
  </ThemeProvider>
);

export const CountryFlags: StoryObj<CountryFlagsProps> = {
  render: Template,
};
