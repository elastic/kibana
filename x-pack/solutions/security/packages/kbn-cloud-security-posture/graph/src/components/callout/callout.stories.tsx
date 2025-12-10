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
import { Callout } from './callout';
import type { CalloutVariant } from './callout.translations';
import { getCalloutConfig } from './callout.config';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';

const mockLinks = {
  integrationUrl: '/app/integrations/browse/security/asset_inventory',
  entityStoreUrl: '/app/security/entity_analytics_entity_store',
  discoverUrl: '/app/discover',
};

// Wrapper component that uses the config function
const CalloutWithConfig = ({ variant }: { variant: CalloutVariant }) => {
  const config = getCalloutConfig(variant, mockLinks);
  const onDismiss = action('onDismiss');

  return (
    <Callout
      title={config.title}
      message={config.message}
      links={config.links}
      onDismiss={onDismiss}
    />
  );
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

export const MissingAllRequirements: StoryObj<{ variant: CalloutVariant }> = {
  render: () => <CalloutWithConfig variant="missingAllRequirements" />,
};

export const UninstalledIntegration: StoryObj<{ variant: CalloutVariant }> = {
  render: () => <CalloutWithConfig variant="uninstalledIntegration" />,
};

export const DisabledEntityStore: StoryObj<{ variant: CalloutVariant }> = {
  render: () => <CalloutWithConfig variant="disabledEntityStore" />,
};

export const UnavailableEntityInfo: StoryObj<{ variant: CalloutVariant }> = {
  render: () => <CalloutWithConfig variant="unavailableEntityInfo" />,
};

export const UnknownEntityType: StoryObj<{ variant: CalloutVariant }> = {
  render: () => <CalloutWithConfig variant="unknownEntityType" />,
};
