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
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';

export default {
  title: 'Components/Graph Components/Callout',
  component: Callout,
  argTypes: {
    variant: {
      options: [
        'missingAllRequirements',
        'uninstalledIntegration',
        'disabledEntityStore',
        'unavailableEntityInfo',
        'unknownEntityType',
      ],
      control: { type: 'radio' },
    },
  },
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
    variant: 'missingAllRequirements',
    onDismiss,
  },
};

export const UninstalledIntegration: StoryObj<CalloutProps> = {
  args: {
    variant: 'uninstalledIntegration',
    onDismiss,
  },
};

export const DisabledEntityStore: StoryObj<CalloutProps> = {
  args: {
    variant: 'disabledEntityStore',
    onDismiss,
  },
};

export const UnavailableEntityInfo: StoryObj<CalloutProps> = {
  args: {
    variant: 'unavailableEntityInfo',
    onDismiss,
  },
};

export const UnknownEntityType: StoryObj<CalloutProps> = {
  args: {
    variant: 'unknownEntityType',
    onDismiss,
  },
};
