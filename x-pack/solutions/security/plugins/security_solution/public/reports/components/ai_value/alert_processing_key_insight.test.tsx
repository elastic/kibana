/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertProcessingKeyInsight } from './alert_processing_key_insight';
import type { ValueMetrics } from './metrics';
import { formatThousands, formatPercent } from './metrics';

// Mock the metrics module
jest.mock('./metrics', () => ({
  formatThousands: jest.fn(),
  formatPercent: jest.fn(),
}));

const mockFormatThousands = formatThousands as jest.MockedFunction<typeof formatThousands>;
const mockFormatPercent = formatPercent as jest.MockedFunction<typeof formatPercent>;

const defaultValueMetrics: ValueMetrics = {
  attackDiscoveryCount: 5,
  filteredAlerts: 800,
  filteredAlertsPerc: 80.0,
  escalatedAlertsPerc: 20.0,
  hoursSaved: 133.33,
  totalAlerts: 1000,
  costSavings: 13333.33,
};

describe('AlertProcessingKeyInsight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatThousands.mockImplementation((value) => value.toLocaleString());
    mockFormatPercent.mockImplementation((value) => `${value.toFixed(2)}%`);
  });

  it('renders the component with correct markup', () => {
    render(<AlertProcessingKeyInsight isLoading={false} valueMetrics={defaultValueMetrics} />);
    expect(screen.getByTestId('alertProcessingKeyInsightsContainer')).toBeInTheDocument();
    expect(screen.getByTestId('alertProcessingKeyInsightsGreetingGroup')).toBeInTheDocument();
    expect(screen.getByTestId('alertProcessingKeyInsightsLogo')).toBeInTheDocument();
    expect(screen.getByTestId('alertProcessingKeyInsightsGreeting')).toBeInTheDocument();
  });

  it('calls formatters with correct values', () => {
    render(<AlertProcessingKeyInsight isLoading={false} valueMetrics={defaultValueMetrics} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(80.0);
    expect(mockFormatThousands).toHaveBeenCalledWith(800);
    expect(mockFormatPercent).toHaveBeenCalledWith(20.0);
    expect(mockFormatThousands).toHaveBeenCalledWith(200);
  });
});
