/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { EntityType } from '../../../../common/entity_analytics/types';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { AssetCriticalitySelector } from './asset_criticality_selector';
import type { State } from './use_asset_criticality';

const criticality = {
  status: 'create',
  query: {},
  privileges: {},
  mutation: {},
} as State;

const criticalityLoading = {
  ...criticality,
  query: { isLoading: true },
} as State;

export default {
  component: AssetCriticalitySelector,
  title: 'Components/AssetCriticalitySelector',
  decorators: [
    (storyFn) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        {storyFn()}
      </ThemeProvider>
    ),
  ],
} as Meta;

export const Default: StoryFn = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div css={{ maxWidth: '300px' }}>
          <AssetCriticalitySelector
            criticality={criticality}
            entity={{ type: EntityType.host, name: 'My test Host' }}
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const Compressed: StoryFn = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div css={{ maxWidth: '300px' }}>
          <AssetCriticalitySelector
            criticality={criticality}
            entity={{ type: EntityType.host as const, name: 'My test Host' }}
            compressed
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const Loading: StoryFn = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div css={{ maxWidth: '300px' }}>
          <AssetCriticalitySelector
            criticality={criticalityLoading}
            entity={{ type: EntityType.host as const, name: 'My test Host' }}
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};
