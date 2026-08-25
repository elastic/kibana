/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { LoadingMessages } from '.';
import { TestProviders } from '../../../../common/mock';

describe('LoadingMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a special-case loading message for the default relative range (of the last 24 hours)', () => {
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

  it('renders the expected loading message for a NON-default relative date range', () => {
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

  it('renders the expected loading message for an absolute date range', () => {
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

  describe('terminal states', () => {
    const defaultProps = {
      alertsContextCount: 10,
      localStorageAttackDiscoveryMaxAlerts: '15',
      start: 'now-24h',
      end: 'now',
    };

    it('renders the success result message when status is succeeded', () => {
      render(
        <TestProviders>
          <LoadingMessages
            {...defaultProps}
            status="succeeded"
            discoveries={2}
            generationEndTime="2025-05-23T08:00:00.000Z"
          />
        </TestProviders>
      );
      const aiCurrentlyAnalyzing = screen.getByTestId('aisCurrentlyAnalyzing');

      expect(aiCurrentlyAnalyzing.textContent).toMatch(/ran successfully/);
    });

    it('renders the failure result message and FailureAccordion when status is failed and reason is provided', () => {
      render(
        <TestProviders>
          <LoadingMessages {...defaultProps} status="failed" reason="Some error occurred" />
        </TestProviders>
      );

      expect(screen.getByTestId('aisCurrentlyAnalyzing').textContent).toMatch(/failed/);
      expect(screen.getByText('Some error occurred')).toBeInTheDocument();
    });

    it('renders the canceled result message when status is canceled', () => {
      render(
        <TestProviders>
          <LoadingMessages {...defaultProps} status="canceled" />
        </TestProviders>
      );

      expect(screen.getByTestId('aisCurrentlyAnalyzing').textContent).toMatch(/canceled/);
    });

    it('renders the progress message when status is started', () => {
      render(
        <TestProviders>
          <LoadingMessages {...defaultProps} status="started" />
        </TestProviders>
      );

      expect(screen.getByTestId('attackDiscoveryGenerationInProgress')).toBeInTheDocument();
    });

    it('renders with connectorName', () => {
      render(
        <TestProviders>
          <LoadingMessages {...defaultProps} connectorName="Test Connector" />
        </TestProviders>
      );

      expect(screen.getByTestId('attackDiscoveryGenerationInProgress').textContent).toMatch(
        /Test Connector/
      );
    });

    it('does not render FailureAccordion when status is failed but reason is empty', () => {
      render(
        <TestProviders>
          <LoadingMessages {...defaultProps} status="failed" reason="" />
        </TestProviders>
      );

      expect(screen.queryByTestId('failuresAccordion')).not.toBeInTheDocument();
    });

    it('does not render FailureAccordion when status is failed but reason is undefined', () => {
      render(
        <TestProviders>
          <LoadingMessages {...defaultProps} status="failed" />
        </TestProviders>
      );

      expect(screen.queryByTestId('failuresAccordion')).not.toBeInTheDocument();
    });
  });
});
