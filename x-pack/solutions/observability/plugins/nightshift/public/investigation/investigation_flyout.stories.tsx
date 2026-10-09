/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiPageTemplate } from '@elastic/eui';
import {
  checkoutDetection,
  checkoutDetectionSignal,
  checkoutEvent,
  completedInvestigation,
  completedInvestigationState,
  entityWithoutEvidence,
  runningInvestigation,
  runningInvestigationState,
  streamOnlyEntity,
} from '../__storybook__/sample_events';
import {
  NightshiftStorybookProvider,
  type NightshiftStreamFeaturesScenario,
} from '../__storybook__/provider';
import { DetectionFlyout } from '../detection/detection_flyout';
import { EntityFlyout } from '../entity/entity_flyout';
import { EventInvestigation } from '../event/event_investigation';
import { InvestigationFlyout } from './investigation_flyout';

type FlyoutScenario =
  | 'investigationCompleted'
  | 'investigationRunning'
  | 'investigationLoading'
  | 'investigationFailed'
  | 'investigationUnavailable'
  | 'investigationEmpty'
  | 'investigationWithoutChat'
  | 'eventInvestigationCompleted'
  | 'eventInvestigationRunning'
  | 'detection'
  | 'detectionUnconfirmed'
  | 'detectionEntitiesLoading'
  | 'detectionEntitiesError'
  | 'entityWithoutEvidence'
  | 'streamEntityWithoutChat';

interface NightshiftFlyoutStoryProps {
  scenario: FlyoutScenario;
}

const noop = () => undefined;
const unconfirmedDetectionSignal = {
  ...checkoutDetectionSignal,
  confirmed: false,
};

const renderScenario = (scenario: FlyoutScenario): React.ReactElement => {
  switch (scenario) {
    case 'investigationRunning':
      return (
        <InvestigationFlyout
          eventTitle={checkoutEvent.title}
          investigation={runningInvestigation}
          status="running"
          state={runningInvestigationState}
          onClose={noop}
        />
      );
    case 'investigationLoading':
      return (
        <InvestigationFlyout
          eventTitle={checkoutEvent.title}
          investigation={runningInvestigation}
          status="loading"
          onClose={noop}
        />
      );
    case 'investigationFailed':
      return (
        <InvestigationFlyout
          eventTitle={checkoutEvent.title}
          investigation={completedInvestigation}
          status="failed"
          error="The investigation failed because no inference connector was available."
          onClose={noop}
        />
      );
    case 'investigationUnavailable':
      return (
        <InvestigationFlyout
          eventTitle={checkoutEvent.title}
          investigation={completedInvestigation}
          status="unavailable"
          error="You do not have permission to view this investigation."
          onClose={noop}
        />
      );
    case 'investigationEmpty':
      return (
        <InvestigationFlyout
          eventTitle={checkoutEvent.title}
          investigation={completedInvestigation}
          status="complete"
          state={{ summary: 'Investigate checkout latency.', hypotheses: [] }}
          onClose={noop}
        />
      );
    case 'investigationWithoutChat':
      return (
        <InvestigationFlyout
          eventTitle={checkoutEvent.title}
          investigation={completedInvestigation}
          status="complete"
          state={completedInvestigationState}
          onClose={noop}
        />
      );
    case 'eventInvestigationCompleted':
      return (
        <EuiPageTemplate.Section color="subdued" restrictWidth={480}>
          <EventInvestigation
            event={checkoutEvent}
            investigation={completedInvestigation}
            status="complete"
            state={completedInvestigationState}
            conversationId="checkout-investigation-conversation"
          />
        </EuiPageTemplate.Section>
      );
    case 'eventInvestigationRunning':
      return (
        <EuiPageTemplate.Section color="subdued" restrictWidth={480}>
          <EventInvestigation
            event={checkoutEvent}
            investigation={runningInvestigation}
            status="running"
            state={runningInvestigationState}
          />
        </EuiPageTemplate.Section>
      );
    case 'detection':
    case 'detectionEntitiesLoading':
    case 'detectionEntitiesError':
      return (
        <DetectionFlyout
          detection={checkoutDetection}
          event={checkoutEvent}
          signal={checkoutDetectionSignal}
          onClose={noop}
        />
      );
    case 'detectionUnconfirmed':
      return (
        <DetectionFlyout
          detection={checkoutDetection}
          event={checkoutEvent}
          signal={unconfirmedDetectionSignal}
          onClose={noop}
        />
      );
    case 'entityWithoutEvidence':
      return <EntityFlyout feature={entityWithoutEvidence} onClose={noop} />;
    case 'streamEntityWithoutChat':
      return (
        <EntityFlyout feature={streamOnlyEntity} enableChatAttachment={false} onClose={noop} />
      );
    case 'investigationCompleted':
      return (
        <InvestigationFlyout
          eventTitle={checkoutEvent.title}
          investigation={completedInvestigation}
          status="complete"
          state={completedInvestigationState}
          conversationId="checkout-investigation-conversation"
          onClose={noop}
        />
      );
  }
};

const getStreamFeaturesScenario = (scenario: FlyoutScenario): NightshiftStreamFeaturesScenario => {
  if (scenario === 'detectionEntitiesLoading') {
    return 'loading';
  }
  if (scenario === 'detectionEntitiesError') {
    return 'error';
  }
  return 'populated';
};

const NightshiftFlyoutStory = ({ scenario }: NightshiftFlyoutStoryProps): React.ReactElement => (
  <NightshiftStorybookProvider streamFeaturesScenario={getStreamFeaturesScenario(scenario)}>
    {renderScenario(scenario)}
  </NightshiftStorybookProvider>
);

const meta: Meta<typeof NightshiftFlyoutStory> = {
  title: 'app/Nightshift/Flyouts',
  component: NightshiftFlyoutStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Deterministic Nightshift investigation, detection, entity, and event-investigation states.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof NightshiftFlyoutStory>;

export const InvestigationCompleted: Story = {
  args: { scenario: 'investigationCompleted' },
};

export const InvestigationRunning: Story = {
  args: { scenario: 'investigationRunning' },
};

export const InvestigationLoading: Story = {
  args: { scenario: 'investigationLoading' },
};

export const InvestigationFailed: Story = {
  args: { scenario: 'investigationFailed' },
};

export const InvestigationUnavailable: Story = {
  args: { scenario: 'investigationUnavailable' },
};

export const InvestigationEmptyResults: Story = {
  args: { scenario: 'investigationEmpty' },
};

export const InvestigationWithoutChat: Story = {
  args: { scenario: 'investigationWithoutChat' },
};

export const EventInvestigationCompleted: Story = {
  args: { scenario: 'eventInvestigationCompleted' },
};

export const EventInvestigationRunning: Story = {
  args: { scenario: 'eventInvestigationRunning' },
};

export const Detection: Story = {
  args: { scenario: 'detection' },
};

export const DetectionUnconfirmed: Story = {
  args: { scenario: 'detectionUnconfirmed' },
};

export const DetectionEntitiesLoading: Story = {
  args: { scenario: 'detectionEntitiesLoading' },
};

export const DetectionEntitiesError: Story = {
  args: { scenario: 'detectionEntitiesError' },
};

export const EntityWithoutEvidence: Story = {
  args: { scenario: 'entityWithoutEvidence' },
};

export const StreamEntityWithoutChat: Story = {
  args: { scenario: 'streamEntityWithoutChat' },
};
