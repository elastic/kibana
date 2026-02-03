/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { EuiSpacer } from '@elastic/eui';
import { CountryFlags as CountryFlagsComponent, useCountryFlagsPopover } from './country_flags';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta = {
  title: 'Components/Graph Components/Additional Components',
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const CountryFlagsStoryComponent: React.FC = () => {
  const twoCountries = ['US', 'FR'];
  const manyCountryCodes = [
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
    'CA',
    'AU',
    'JP',
  ];

  const countryFlagsPopover = useCountryFlagsPopover(manyCountryCodes);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <CountryFlagsComponent countryCodes={twoCountries} />
      <EuiSpacer size="l" />
      <CountryFlagsComponent countryCodes={manyCountryCodes} />
      <EuiSpacer size="l" />
      <CountryFlagsComponent
        countryCodes={manyCountryCodes}
        onCountryClick={countryFlagsPopover.onCountryClick}
      />
      <countryFlagsPopover.PopoverComponent />
    </ThemeProvider>
  );
};

export const CountryFlags: StoryObj = {
  render: () => <CountryFlagsStoryComponent />,
};
