/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertProcessing } from './alert_processing';
import { AlertProcessingKeyInsight } from './alert_processing_key_insight';
import { AlertsProcessingTable } from './alert_processing_table';
import { AlertProcessingDonut } from './alert_processing_donut_lens';
import { formatPercent } from './metrics';
import type { ValueMetrics } from './metrics';

// Mock child components
jest.mock('./alert_processing_key_insight', () => ({
  AlertProcessingKeyInsight: jest.fn(() => (
    <div data-test-subj="mock-alert-processing-key-insight" />
  )),
}));

jest.mock('./alert_processing_table', () => ({
  AlertsProcessingTable: jest.fn(() => <div data-test-subj="mock-alerts-processing-table" />),
}));

jest.mock('./alert_processing_donut_lens', () => ({
  AlertProcessingDonut: jest.fn(() => <div data-test-subj="mock-alert-processing-donut" />),
}));

// Mock the metrics module
jest.mock('./metrics', () => ({
  formatPercent: jest.fn(),
}));

const mockFormatPercent = formatPercent as jest.MockedFunction<typeof formatPercent>;
const mockAlertProcessingKeyInsight = AlertProcessingKeyInsight as jest.MockedFunction<
  typeof AlertProcessingKeyInsight
>;
const mockAlertsProcessingTable = AlertsProcessingTable as jest.MockedFunction<
  typeof AlertsProcessingTable
>;
const mockAlertProcessingDonut = AlertProcessingDonut as jest.MockedFunction<
  typeof AlertProcessingDonut
>;

const defaultValueMetrics: ValueMetrics = {
  attackDiscoveryCount: 5,
  filteredAlerts: 800,
  filteredAlertsPerc: 80.0,
  escalatedAlertsPerc: 20.0,
  hoursSaved: 133.33,
  totalAlerts: 1000,
  costSavings: 13333.33,
};

const defaultProps = {
  valueMetrics: defaultValueMetrics,
  attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
};

describe('AlertProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockFormatPercent.mockImplementation((value) => `${value.toFixed(2)}%`);
  });

  it('renders all child components with correct props', () => {
    render(<AlertProcessing {...defaultProps} />);

    // Verify AlertProcessingDonut is rendered with correct props
    expect(mockAlertProcessingDonut).toHaveBeenCalledWith(
      {
        attackAlertIds: defaultProps.attackAlertIds,
        from: defaultProps.from,
        to: defaultProps.to,
      },
      {}
    );

    // Verify AlertsProcessingTable is rendered with correct props
    expect(mockAlertsProcessingTable).toHaveBeenCalledWith(
      {
        filteredAlerts: defaultValueMetrics.filteredAlerts,
        escalatedAlerts: defaultValueMetrics.totalAlerts - defaultValueMetrics.filteredAlerts,
        filteredAlertsPerc: '80.00%',
        escalatedAlertsPerc: '20.00%',
      },
      {}
    );

    // Verify AlertProcessingKeyInsight is rendered with correct props
    expect(mockAlertProcessingKeyInsight).toHaveBeenCalledWith(
      {
        valueMetrics: defaultValueMetrics,
      },
      {}
    );
  });

  it('calls formatPercent with correct values', () => {
    render(<AlertProcessing {...defaultProps} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(80.0);
    expect(mockFormatPercent).toHaveBeenCalledWith(20.0);
  });

  it('calculates escalated alerts correctly', () => {
    render(<AlertProcessing {...defaultProps} />);

    // escalatedAlerts = totalAlerts - filteredAlerts = 1000 - 800 = 200
    expect(mockAlertsProcessingTable).toHaveBeenCalledWith(
      expect.objectContaining({
        escalatedAlerts: 200,
      }),
      {}
    );
  });

  it('handles edge case where all alerts are filtered', () => {
    const allFilteredMetrics: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlerts: 1000,
      totalAlerts: 1000,
      filteredAlertsPerc: 100,
      escalatedAlertsPerc: 0,
    };

    const propsWithAllFiltered = {
      ...defaultProps,
      valueMetrics: allFilteredMetrics,
    };

    render(<AlertProcessing {...propsWithAllFiltered} />);

    expect(mockAlertsProcessingTable).toHaveBeenCalledWith(
      expect.objectContaining({
        filteredAlerts: 1000,
        escalatedAlerts: 0, // 1000 - 1000
        filteredAlertsPerc: '100.00%',
        escalatedAlertsPerc: '0.00%',
      }),
      {}
    );
  });

  it('handles edge case where no alerts are filtered', () => {
    const noneFilteredMetrics: ValueMetrics = {
      ...defaultValueMetrics,
      filteredAlerts: 0,
      totalAlerts: 1000,
      filteredAlertsPerc: 0,
      escalatedAlertsPerc: 100,
    };

    const propsWithNoneFiltered = {
      ...defaultProps,
      valueMetrics: noneFilteredMetrics,
    };

    render(<AlertProcessing {...propsWithNoneFiltered} />);

    expect(mockAlertsProcessingTable).toHaveBeenCalledWith(
      expect.objectContaining({
        filteredAlerts: 0,
        escalatedAlerts: 1000, // 1000 - 0
        filteredAlertsPerc: '0.00%',
        escalatedAlertsPerc: '100.00%',
      }),
      {}
    );
  });

  it('passes all required props to child components', () => {
    render(<AlertProcessing {...defaultProps} />);

    // Verify all components receive their expected props
    expect(mockAlertProcessingDonut).toHaveBeenCalledTimes(1);
    expect(mockAlertsProcessingTable).toHaveBeenCalledTimes(1);
    expect(mockAlertProcessingKeyInsight).toHaveBeenCalledTimes(1);
  });
});
