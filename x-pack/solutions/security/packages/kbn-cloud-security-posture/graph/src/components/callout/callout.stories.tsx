/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { action } from '@storybook/addon-actions';
import { Callout, type CalloutProps } from './callout';
import { getCalloutConfig } from './callout.config';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';

const mockLinks = {
  integrationUrl: '/app/integrations/browse/security/asset_inventory',
  entityStoreUrl: '/app/security/entity_analytics_entity_store',
  discoverUrl: '/app/discover',
};

export default {
  title: 'Components/Graph Components/Callout',
  component: Callout,
  decorators: [
    GlobalStylesStorybookDecorator,
    (Story) => (
      <ThemeProvider theme={{ darkMode: false }}>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Callout>;

const onDismiss = action('onDismiss');

export const MissingAllRequirements: StoryObj<CalloutProps> = {
  args: {
    ...getCalloutConfig('missingAllRequirements', mockLinks),
    onDismiss,
  },
};

export const UninstalledIntegration: StoryObj<CalloutProps> = {
  args: {
    ...getCalloutConfig('uninstalledIntegration', mockLinks),
    onDismiss,
  },
};

export const DisabledEntityStore: StoryObj<CalloutProps> = {
  args: {
    ...getCalloutConfig('disabledEntityStore', mockLinks),
    onDismiss,
  },
};

export const UnavailableEntityInfo: StoryObj<CalloutProps> = {
  args: {
    ...getCalloutConfig('unavailableEntityInfo', mockLinks),
    onDismiss,
  },
};

export const UnknownEntityType: StoryObj<CalloutProps> = {
  args: {
    ...getCalloutConfig('unknownEntityType', mockLinks),
    onDismiss,
  },
};
