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

    // Setup default mock implementations
    mockFormatThousands.mockImplementation((value) => value.toLocaleString());
    mockFormatPercent.mockImplementation((value) => `${value.toFixed(2)}%`);
  });

  it('renders the component with correct data-test-subj', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsContainer')).toBeInTheDocument();
  });

  it('renders the greeting group with correct data-test-subj', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsGreetingGroup')).toBeInTheDocument();
  });

  it('renders the Elastic logo with correct data-test-subj', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsLogo')).toBeInTheDocument();
  });

  it('renders the greeting text with correct data-test-subj', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    expect(screen.getByTestId('alertProcessingKeyInsightsGreeting')).toBeInTheDocument();
  });

  it('calls formatPercent with correct filteredAlertsPerc value', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(80.0);
  });

  it('calls formatThousands with correct filteredAlerts value', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    expect(mockFormatThousands).toHaveBeenCalledWith(800);
  });

  it('calls formatPercent with correct escalatedAlertsPerc value', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(20.0);
  });

  it('calls formatThousands with correct escalated alerts count', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    // escalatedAlerts = totalAlerts - filteredAlerts = 1000 - 800 = 200
    expect(mockFormatThousands).toHaveBeenCalledWith(200);
  });

  it('handles zero filteredAlerts', () => {
    const metricsWithZeroFiltered: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlerts: 0,
      filteredAlertsPerc: 0,
      escalatedAlertsPerc: 100,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsWithZeroFiltered} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(0);
    expect(mockFormatThousands).toHaveBeenCalledWith(0);
    expect(mockFormatPercent).toHaveBeenCalledWith(100);
    expect(mockFormatThousands).toHaveBeenCalledWith(1000); // totalAlerts - 0
  });

  it('handles zero totalAlerts', () => {
    const metricsWithZeroTotal: ValueMetrics = {
      ...defaultValueMetrics,
      totalAlerts: 0,
      filteredAlerts: 0,
      filteredAlertsPerc: 0,
      escalatedAlertsPerc: 0,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsWithZeroTotal} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(0);
    expect(mockFormatThousands).toHaveBeenCalledWith(0);
    expect(mockFormatPercent).toHaveBeenCalledWith(0);
    expect(mockFormatThousands).toHaveBeenCalledWith(0); // 0 - 0
  });

  it('handles all alerts filtered (100% filtered)', () => {
    const metricsAllFiltered: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlerts: 1000,
      filteredAlertsPerc: 100,
      escalatedAlertsPerc: 0,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsAllFiltered} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(100);
    expect(mockFormatThousands).toHaveBeenCalledWith(1000);
    expect(mockFormatPercent).toHaveBeenCalledWith(0);
    expect(mockFormatThousands).toHaveBeenCalledWith(0); // 1000 - 1000
  });

  it('handles all alerts escalated (0% filtered)', () => {
    const metricsAllEscalated: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlerts: 0,
      filteredAlertsPerc: 0,
      escalatedAlertsPerc: 100,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsAllEscalated} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(0);
    expect(mockFormatThousands).toHaveBeenCalledWith(0);
    expect(mockFormatPercent).toHaveBeenCalledWith(100);
    expect(mockFormatThousands).toHaveBeenCalledWith(1000); // 1000 - 0
  });

  it('handles large numbers correctly', () => {
    const metricsWithLargeNumbers: ValueMetrics = {
      ...defaultValueMetrics,
      totalAlerts: 1000000,
      filteredAlerts: 750000,
      filteredAlertsPerc: 75.0,
      escalatedAlertsPerc: 25.0,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsWithLargeNumbers} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(75.0);
    expect(mockFormatThousands).toHaveBeenCalledWith(750000);
    expect(mockFormatPercent).toHaveBeenCalledWith(25.0);
    expect(mockFormatThousands).toHaveBeenCalledWith(250000); // 1000000 - 750000
  });

  it('handles decimal percentages correctly', () => {
    const metricsWithDecimals: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlertsPerc: 83.33,
      escalatedAlertsPerc: 16.67,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsWithDecimals} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(83.33);
    expect(mockFormatPercent).toHaveBeenCalledWith(16.67);
  });

  it('renders list items with correct structure', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('renders horizontal rule', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    const horizontalRule = screen.getByRole('separator');
    expect(horizontalRule).toBeInTheDocument();
  });

  it('renders strong elements for emphasized text', () => {
    render(<AlertProcessingKeyInsight valueMetrics={defaultValueMetrics} />);

    const strongElements = screen.getAllByText((content, element) => {
      return element?.tagName.toLowerCase() === 'strong';
    });
    expect(strongElements).toHaveLength(2);
  });

  it('handles edge case where filteredAlerts equals totalAlerts', () => {
    const metricsEqual: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlerts: 1000,
      totalAlerts: 1000,
      filteredAlertsPerc: 100,
      escalatedAlertsPerc: 0,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsEqual} />);

    expect(mockFormatThousands).toHaveBeenCalledWith(1000);
    expect(mockFormatThousands).toHaveBeenCalledWith(0); // 1000 - 1000
  });

  it('handles negative values gracefully', () => {
    const metricsWithNegative: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlerts: -100,
      filteredAlertsPerc: -10,
      escalatedAlertsPerc: 110,
    };

    render(<AlertProcessingKeyInsight valueMetrics={metricsWithNegative} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(-10);
    expect(mockFormatThousands).toHaveBeenCalledWith(-100);
    expect(mockFormatPercent).toHaveBeenCalledWith(110);
    expect(mockFormatThousands).toHaveBeenCalledWith(1100); // 1000 - (-100)
  });
});
