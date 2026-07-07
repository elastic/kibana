/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { createItems, TEST_COLUMNS } from './test_utils';
import { ConditionsTable } from '.';

export default {
  title: 'Components/ConditionsTable',
  decorators: [
    (storyFn) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        {storyFn()}
      </ThemeProvider>
    ),
  ],
} as Meta;

export const SingleItem = {
  render: () => {
    return <ConditionsTable items={createItems(1)} columns={TEST_COLUMNS} badge="and" />;
  },

  name: 'single item',
};

export const And = {
  render: () => {
    return <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="and" />;
  },

  name: 'and',
};

export const Or = {
  render: () => {
    return <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="or" />;
  },

  name: 'or',
};
