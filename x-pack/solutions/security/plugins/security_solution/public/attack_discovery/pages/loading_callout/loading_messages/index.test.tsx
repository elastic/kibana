/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { LoadingMessages } from '.';
import { TestProviders } from '../../../../common/mock';

jest.mock('@kbn/elastic-assistant-common', () => {
  const original = jest.requireActual('@kbn/elastic-assistant-common');

  return {
    ...original,
    defaultAssistantFeatures: {
      ...original.defaultAssistantFeatures,
      attackDiscoveryAlertFiltering: jest.mocked<boolean>(false), // <-- feature flag is off by default
    },
  };
});

describe('LoadingMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (defaultAssistantFeatures.attackDiscoveryAlertFiltering as jest.Mocked<boolean>) = false; // reset feature flag to off
  });

  it('renders the expected loading message, when the attackDiscoveryAlertFiltering feature flag is off', () => {
    render(
      <TestProviders>
        <LoadingMessages alertsContextCount={20} localStorageAttackDiscoveryMaxAlerts={undefined} />
      </TestProviders>
    );
    const aiCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aiCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 20 alerts in the last 24 hours to generate discoveries.'
    );
  });

  it('renders a special-case loading message for the default relative range (of the last 24 hours), when attackDiscoveryAlertFiltering is on', () => {
    (defaultAssistantFeatures.attackDiscoveryAlertFiltering as jest.Mocked<boolean>) = true; // <-- feature flag is on

    render(
      <TestProviders>
        <LoadingMessages
          alertsContextCount={20}
          localStorageAttackDiscoveryMaxAlerts={'30'}
          start={'now-24h'} // <-- special-case default relative range
          end={'now'}
        />
      </TestProviders>
    );
    const aiCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aiCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 20 alerts in the last 24 hours to generate discoveries.'
    );
  });

  it('renders the expected loading message for a NON-default relative date range, when attackDiscoveryAlertFiltering is on', () => {
    (defaultAssistantFeatures.attackDiscoveryAlertFiltering as jest.Mocked<boolean>) = true;

    render(
      <TestProviders>
        <LoadingMessages
          alertsContextCount={20}
          localStorageAttackDiscoveryMaxAlerts={'30'}
          start={'now-72h'} // <-- NON-default relative date range
          end={'now'}
        />
      </TestProviders>
    );
    const aiCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aiCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 20 alerts from now-72h to now to generate discoveries.'
    );
  });

  it('renders the expected loading message for an absolute date range, when attackDiscoveryAlertFiltering is on', () => {
    (defaultAssistantFeatures.attackDiscoveryAlertFiltering as jest.Mocked<boolean>) = true;

    render(
      <TestProviders>
        <LoadingMessages
          alertsContextCount={20}
          localStorageAttackDiscoveryMaxAlerts={'30'}
          start={'2025-01-01T00:00:00.000Z'}
          end={'2025-01-02T00:00:00.000Z'}
        />
      </TestProviders>
    );
    const aiCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aiCurrentlyAnalyzing).toHaveTextContent(
      /AI is analyzing up to 20 alerts from \w+ \d+, \d+ @ \d+:\d+:\d+.\d+ to \w+ \d+, \d+ @ \d+:\d+:\d+.\d+ to generate discoveries./
    );
  });

  it('renders the expected loading message with the default max alerts (from local storage) when alertsContextCount is null', () => {
    (defaultAssistantFeatures.attackDiscoveryAlertFiltering as jest.Mocked<boolean>) = true;

    render(
      <TestProviders>
        <LoadingMessages
          alertsContextCount={null} // <-- null
          localStorageAttackDiscoveryMaxAlerts={'30'} // <-- default fallback
        />
      </TestProviders>
    );
    const aiCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aiCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 30 alerts in the last 24 hours to generate discoveries.'
    );
  });
});
