/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { LoadingCallout } from '.';

jest.mock('@kbn/react-kibana-context-theme', () => ({
  useKibanaIsDarkMode: jest.fn(() => false),
}));

jest.mock('../use_dismiss_attack_discovery_generations', () => ({
  useDismissAttackDiscoveryGeneration: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
}));

describe('LoadingCallout', () => {
  const defaultProps = {
    alertsContextCount: 30,
    approximateFutureTime: new Date(),
    localStorageAttackDiscoveryMaxAlerts: '50',
  };

  it('renders the animated loading icon', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );

    const loadingElastic = screen.getByTestId('loadingElastic');

    expect(loadingElastic).toBeInTheDocument();
  });

  it('renders loading messages with the expected count', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );

    const aisCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

    expect(aisCurrentlyAnalyzing).toHaveTextContent(
      'AI is analyzing up to 30 alerts in the last 24 hours to generate discoveries.'
    );
  });

  it('renders the countdown', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} />
      </TestProviders>
    );
    const countdown = screen.getByTestId('countdown');

    expect(countdown).toBeInTheDocument();
  });

  it('renders a terminal state icon for succeeded', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} status="succeeded" executionUuid="uuid-123" />
      </TestProviders>
    );
    const icon = screen
      .getByTestId('loadingCallout')
      .querySelector('[data-euiicon-type="logoElastic"]');

    expect(icon).not.toBeNull();
  });

  it('renders terminal state icon for failed', () => {
    render(
      <TestProviders>
        <LoadingCallout {...defaultProps} status="failed" executionUuid="uuid-123" />
      </TestProviders>
    );
    const icon = screen
      .getByTestId('loadingCallout')
      .querySelector('[data-euiicon-type="logoElastic"]');

    expect(icon).not.toBeNull();
  });
});
