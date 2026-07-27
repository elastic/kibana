/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  checkoutEvent,
  completedInvestigation,
  completedInvestigationState,
} from '../__storybook__/nightshift_fixtures';
import { NightshiftStorybookProvider } from '../__storybook__/nightshift_storybook_provider';
import { InvestigationFlyout } from './investigation_flyout';

const CompletedInvestigationStory = (): React.ReactElement => (
  <NightshiftStorybookProvider>
    <InvestigationFlyout
      eventTitle={checkoutEvent.title}
      investigation={completedInvestigation}
      status="complete"
      state={completedInvestigationState}
      conversationId="checkout-investigation-conversation"
      onClose={() => undefined}
    />
  </NightshiftStorybookProvider>
);

const meta: Meta<typeof CompletedInvestigationStory> = {
  title: 'app/Nightshift/Flyouts/Investigation',
  component: CompletedInvestigationStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A completed investigation with recommendations, blind spots, and hypotheses. Use the tabs and row expanders to inspect every condition.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof CompletedInvestigationStory>;

export const Completed: Story = {};
