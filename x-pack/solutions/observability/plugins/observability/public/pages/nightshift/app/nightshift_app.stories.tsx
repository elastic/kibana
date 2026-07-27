/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiPageTemplate } from '@elastic/eui';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { checkoutEvent } from '../__storybook__/nightshift_fixtures';
import {
  NightshiftStorybookProvider,
  type NightshiftStorybookScenario,
} from '../__storybook__/nightshift_storybook_provider';
import { NightshiftApp } from './nightshift_app';
import { NightshiftAppHeader } from './nightshift_app_header';

const noop = () => undefined;

interface NightshiftLandingStoryProps {
  initialEntry?: string;
  scenario: NightshiftStorybookScenario;
}

const NightshiftLandingStory = ({
  initialEntry,
  scenario,
}: NightshiftLandingStoryProps): React.ReactElement => (
  <NightshiftStorybookProvider initialEntry={initialEntry} scenario={scenario}>
    <MockAppHeaderProvider>
      <EuiPageTemplate restrictWidth={false}>
        <NightshiftAppHeader
          onSettingsClick={noop}
          settingsHref="/app/streams/_discovery/settings"
        />
        <EuiPageTemplate.Section component="div" color="subdued" restrictWidth="900px">
          <NightshiftApp />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </MockAppHeaderProvider>
  </NightshiftStorybookProvider>
);

const meta: Meta<typeof NightshiftLandingStory> = {
  title: 'app/Nightshift/Landing',
  component: NightshiftLandingStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof NightshiftLandingStory>;

export const LookingIntoYourData: Story = {
  args: {
    scenario: 'loading',
  },
};

export const LoadingToHappyPath: Story = {
  args: {
    scenario: 'loadingThenPopulated',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The mocked request resolves after 1.5 seconds. Remount the story to replay the transition into the populated landing page.',
      },
    },
  },
};

export const NoSignificantEvents: Story = {
  args: {
    scenario: 'empty',
  },
};

export const EventsProcessedWithData: Story = {
  args: {
    scenario: 'populated',
  },
};

export const AllEventsResolved: Story = {
  args: {
    scenario: 'allClear',
  },
};

export const RequestError: Story = {
  args: {
    scenario: 'error',
  },
};

export const EventFlyoutOpen: Story = {
  args: {
    initialEntry: `/?eventUuid=${checkoutEvent.event_uuid}`,
    scenario: 'populated',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The event flyout is restored from the URL. Select its detection card to inspect the nested detection flyout and its entity chip.',
      },
    },
  },
};
