/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TestProviders } from '../../../common/mock/test_providers';
import { AlertProcessingKeyInsight } from './alert_processing_key_insight';
import type { ValueMetrics } from './metrics';
import * as metrics from './metrics';

describe('AlertProcessingKeyInsight', () => {
  const defaultValueMetrics: ValueMetrics = {
    attackDiscoveryCount: 5,
    filteredAlerts: 800,
    filteredAlertsPerc: 80.0,
    escalatedAlertsPerc: 20.0,
    hoursSaved: 133.33,
    totalAlerts: 1000,
    costSavings: 13333.33,
  };

  const defaultProps: React.ComponentProps<typeof AlertProcessingKeyInsight> = {
    isLoading: false,
    valueMetrics: defaultValueMetrics,
  };

  const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
    render(
      <TestProviders>
        <AlertProcessingKeyInsight {...defaultProps} {...overrides} />
      </TestProviders>
    );

  let formatThousandsSpy: jest.SpyInstance;
  let formatPercentSpy: jest.SpyInstance;

  beforeEach(() => {
    formatThousandsSpy = jest.spyOn(metrics, 'formatThousands');
    formatPercentSpy = jest.spyOn(metrics, 'formatPercent');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  [
    'alertProcessingKeyInsightsContainer',
    'alertProcessingKeyInsightsGreetingGroup',
    'alertProcessingKeyInsightsLogo',
    'alertProcessingKeyInsightsGreeting',
  ].forEach((testId) => {
    it(`returns the ${testId} element`, () => {
      renderComponent();
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  });

  it('returns escalated copy without "Only" when escalated is 100%', () => {
    renderComponent({
      valueMetrics: {
        ...defaultValueMetrics,
        filteredAlertsPerc: 0,
        filteredAlerts: 0,
        escalatedAlertsPerc: 100,
        totalAlerts: 8,
      },
    });

    expect(screen.queryByText(/Focused escalations:\s*Only/i)).not.toBeInTheDocument();
  });

  it('returns filtered copy indicating analysts reviewed all alerts manually when filtered is 0%', () => {
    renderComponent({
      valueMetrics: {
        ...defaultValueMetrics,
        filteredAlertsPerc: 0,
        filteredAlerts: 0,
        totalAlerts: 8,
      },
    });

    expect(screen.getByText(/reviewed all alerts manually/i)).toBeInTheDocument();
  });

  it('returns filtered copy indicating analysts reviewed no alerts manually when filtered is 100%', () => {
    renderComponent({
      valueMetrics: {
        ...defaultValueMetrics,
        filteredAlerts: 8,
        filteredAlertsPerc: 100,
        escalatedAlertsPerc: 0,
        totalAlerts: 8,
      },
    });

    expect(screen.getByText(/reviewed no alerts manually/i)).toBeInTheDocument();
  });

  it('returns escalated copy with "Only" when escalated is not 0% or 100%', () => {
    renderComponent({
      valueMetrics: { ...defaultValueMetrics, escalatedAlertsPerc: 12.34, totalAlerts: 100 },
    });

    expect(screen.getByText(/Focused escalations:\s*Only/i)).toBeInTheDocument();
  });

  [
    { fn: 'formatPercent', value: 80.0, spy: () => formatPercentSpy },
    { fn: 'formatPercent', value: 20.0, spy: () => formatPercentSpy },
    { fn: 'formatThousands', value: 800, spy: () => formatThousandsSpy },
    { fn: 'formatThousands', value: 200, spy: () => formatThousandsSpy },
  ].forEach(({ fn, value, spy }) => {
    it(`returns formatter call for ${fn}(${value})`, () => {
      renderComponent();
      expect(spy()).toHaveBeenCalledWith(value);
    });
  });
});
