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

import { ItemDetailsAction, ItemDetailsCard, ItemDetailsPropertySummary } from '.';

export default {
  title: 'Components/ItemDetailsCard',
  decorators: [
    (storyFn) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        {storyFn()}
      </ThemeProvider>
    ),
  ],
} as Meta;

export const Default = {
  render: () => {
    return (
      <ItemDetailsCard>
        <ItemDetailsPropertySummary name={'property 1'} value={'value 1'} />
        <ItemDetailsPropertySummary name={'property 2'} value={'value 2'} />
        <ItemDetailsPropertySummary name={'property 3'} value={'value 3'} />

        {'content text '}
        <strong>{'content node'}</strong>

        <ItemDetailsAction size="s" color="primary">
          {'primary'}
        </ItemDetailsAction>
        <ItemDetailsAction size="s" color="success">
          {'success'}
        </ItemDetailsAction>
        <ItemDetailsAction size="s" color="danger">
          {'danger'}
        </ItemDetailsAction>
      </ItemDetailsCard>
    );
  },

  name: 'default',
};
