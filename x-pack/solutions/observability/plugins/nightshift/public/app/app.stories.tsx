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
import { checkoutEvent } from '../__storybook__/sample_events';
import {
  NightshiftStorybookProvider,
  type NightshiftLifecycleScenario,
  type NightshiftStorybookScenario,
  type NightshiftStreamFeaturesScenario,
} from '../__storybook__/provider';
import { NightshiftApp } from './app';
import { NightshiftAppHeader } from './app_header';

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

export const ImpactedServicesUnavailable: Story = {
  args: {
    scenario: 'populated',
    streamFeaturesScenario: 'error',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Every stream refuses its knowledge indicators, so nothing resolves and the panel shows only the error and a retry.',
      },
    },
  },
};

export const ImpactedServicesPartiallyUnavailable: Story = {
  args: {
    scenario: 'populated',
    streamFeaturesScenario: 'partialError',
  },
  parameters: {
    docs: {
      description: {
        story:
          'One stream is unreachable while the others resolve. The chips that did resolve stay on the page and the callout names the stream that did not, rather than presenting a short list as a complete one.',
      },
    },
  },
};

export const EventFlyoutImpactedServicesPartiallyUnavailable: Story = {
  args: {
    initialEntry: `/?eventId=${checkoutEvent.event_id}`,
    scenario: 'populated',
    streamFeaturesScenario: 'partialError',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The same partial failure inside a detection. Select the detection card to see the impacted services section keep its resolved chips alongside the callout.',
      },
    },
  },
};

export const BlastRadiusFilterActive: Story = {
  args: {
    initialEntry: '/?impactedServices=entity%3Acheckout-api%3Acheckout-api',
    scenario: 'populated',
  },
};

export const EventNotFound: Story = {
  args: {
    initialEntry: '/?eventId=unknown-event',
    scenario: 'populated',
  },
};

export const EventFlyoutOpen: Story = {
  args: {
    initialEntry: `/?eventId=${checkoutEvent.event_id}`,
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
    initialEntry: `/?eventId=${checkoutEvent.event_id}`,
    lifecycleScenario: 'loading',
    scenario: 'populated',
  },
};

export const EventFlyoutDetectionsError: Story = {
  args: {
    initialEntry: `/?eventId=${checkoutEvent.event_id}`,
    lifecycleScenario: 'error',
    scenario: 'populated',
  },
};

export const EventFlyoutWithoutDetections: Story = {
  args: {
    initialEntry: `/?eventId=${checkoutEvent.event_id}`,
    lifecycleScenario: 'empty',
    scenario: 'populated',
  },
};
