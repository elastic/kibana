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

jest.mock('./alert_processing_key_insight');
jest.mock('./alert_processing_table');
jest.mock('./alert_processing_donut_lens');

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
  isLoading: false,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
};

describe('AlertProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFormatPercent.mockImplementation((value) => `${value.toFixed(2)}%`);
  });

  it('renders all child components with correct props', () => {
    render(<AlertProcessing {...defaultProps} />);

    expect(mockAlertProcessingDonut).toHaveBeenCalledWith(
      {
        attackAlertIds: defaultProps.attackAlertIds,
        from: defaultProps.from,
        to: defaultProps.to,
      },
      {}
    );

    expect(mockAlertsProcessingTable).toHaveBeenCalledWith(
      {
        filteredAlerts: defaultValueMetrics.filteredAlerts,
        escalatedAlerts: defaultValueMetrics.totalAlerts - defaultValueMetrics.filteredAlerts,
        filteredAlertsPerc: '80.00%',
        escalatedAlertsPerc: '20.00%',
        isLoading: false,
      },
      {}
    );

    expect(mockAlertProcessingKeyInsight).toHaveBeenCalledWith(
      {
        isLoading: false,
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

    expect(mockAlertsProcessingTable).toHaveBeenCalledWith(
      expect.objectContaining({
        escalatedAlerts: 200,
      }),
      {}
    );
  });

  it('passes all required props to child components', () => {
    render(<AlertProcessing {...defaultProps} />);

    expect(mockAlertProcessingDonut).toHaveBeenCalledTimes(1);
    expect(mockAlertsProcessingTable).toHaveBeenCalledTimes(1);
    expect(mockAlertProcessingKeyInsight).toHaveBeenCalledTimes(1);
  });
});
