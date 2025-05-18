/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import type { Meta } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { LogicButtons } from './logic_buttons';

export default {
  title: 'ThreatMatching|LogicButtons',
  decorators: [
    (storyFn) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        {storyFn()}
      </ThemeProvider>
    ),
  ],
} as Meta;

export const AndOrButtons = {
  render: () => {
    return (
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
      />
    );
  },

  name: 'and/or buttons',
};

export const AndDisabled = {
  render: () => {
    return (
      <LogicButtons
        isAndDisabled
        isOrDisabled={false}
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
      />
    );
  },

  name: 'and disabled',
};

export const OrDisabled = {
  render: () => {
    return (
      <LogicButtons
        isAndDisabled={false}
        isOrDisabled
        onOrClicked={action('onClick')}
        onAndClicked={action('onClick')}
      />
    );
  },

  name: 'or disabled',
};
