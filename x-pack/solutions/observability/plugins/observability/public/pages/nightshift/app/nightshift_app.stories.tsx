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
  type NightshiftLifecycleScenario,
  type NightshiftStorybookScenario,
  type NightshiftStreamFeaturesScenario,
} from '../__storybook__/nightshift_storybook_provider';
import { NightshiftApp } from './nightshift_app';
import { NightshiftAppHeader } from './nightshift_app_header';

const noop = () => undefined;

interface NightshiftLandingStoryProps {
  initialEntry?: string;
  lifecycleScenario?: NightshiftLifecycleScenario;
  scenario: NightshiftStorybookScenario;
  streamFeaturesScenario?: NightshiftStreamFeaturesScenario;
}

const NightshiftLandingStory = ({
  initialEntry,
  lifecycleScenario,
  scenario,
  streamFeaturesScenario,
}: NightshiftLandingStoryProps): React.ReactElement => (
  <NightshiftStorybookProvider
    initialEntry={initialEntry}
    lifecycleScenario={lifecycleScenario}
    scenario={scenario}
    streamFeaturesScenario={streamFeaturesScenario}
  >
    <MockAppHeaderProvider>
      <EuiPageTemplate restrictWidth={false}>
        <NightshiftAppHeader
          onSettingsClick={noop}
          settingsHref="/app/significant_events/settings"
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

export const LoadingToPopulatedContent: Story = {
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

export const CachedResultsWithRefreshError: Story = {
  args: {
    scenario: 'cachedError',
  },
};

export const OpenEventsOnly: Story = {
  args: {
    scenario: 'openOnly',
  },
};

export const DismissedEventInResolvedSection: Story = {
  args: {
    scenario: 'dismissed',
  },
};

export const BlastRadiusFilterActive: Story = {
  args: {
    initialEntry: '/?blastRadius=entity%3Acheckout-api%3Acheckout-api',
    scenario: 'populated',
  },
};

export const EventNotFound: Story = {
  args: {
    initialEntry: '/?eventUuid=unknown-event',
    scenario: 'populated',
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

export const EventFlyoutDetectionsLoading: Story = {
  args: {
    initialEntry: `/?eventUuid=${checkoutEvent.event_uuid}`,
    lifecycleScenario: 'loading',
    scenario: 'populated',
  },
};

export const EventFlyoutDetectionsError: Story = {
  args: {
    initialEntry: `/?eventUuid=${checkoutEvent.event_uuid}`,
    lifecycleScenario: 'error',
    scenario: 'populated',
  },
};

export const EventFlyoutWithoutDetections: Story = {
  args: {
    initialEntry: `/?eventUuid=${checkoutEvent.event_uuid}`,
    lifecycleScenario: 'empty',
    scenario: 'populated',
  },
};
