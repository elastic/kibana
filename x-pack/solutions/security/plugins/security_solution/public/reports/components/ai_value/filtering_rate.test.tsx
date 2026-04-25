/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FilteringRate } from './filtering_rate';
import { AlertFilteringMetric } from './alert_filtering_metric';
import { ComparePercentage } from './compare_percentage';
import { formatPercent, getTimeRangeAsDays } from './metrics';

// Mock dependencies
jest.mock('./alert_filtering_metric', () => ({
  AlertFilteringMetric: jest.fn(() => <div data-test-subj="mock-alert-filtering-metric" />),
}));

jest.mock('./compare_percentage', () => ({
  ComparePercentage: jest.fn(() => <div data-test-subj="mock-compare-percentage" />),
}));

jest.mock('./metrics', () => ({
  formatPercent: jest.fn(),
  getTimeRangeAsDays: jest.fn(),
}));

const mockFormatPercent = formatPercent as jest.MockedFunction<typeof formatPercent>;
const mockGetTimeRangeAsDays = getTimeRangeAsDays as jest.MockedFunction<typeof getTimeRangeAsDays>;

const defaultProps = {
  attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
  filteredAlertsPerc: 75.5,
  filteredAlertsPercCompare: 60.0,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  totalAlerts: 1000,
};

describe('FilteringRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatPercent.mockReturnValue('60.0%');
    mockGetTimeRangeAsDays.mockReturnValue('30');
  });

  it('renders the component with correct structure', () => {
    render(<FilteringRate {...defaultProps} />);

    expect(AlertFilteringMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        attackAlertIds: defaultProps.attackAlertIds,
        totalAlerts: defaultProps.totalAlerts,
        from: defaultProps.from,
        to: defaultProps.to,
      }),
      {}
    );

    expect(ComparePercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        positionForLens: true,
        currentCount: defaultProps.filteredAlertsPerc,
        previousCount: defaultProps.filteredAlertsPercCompare,
        stat: '60.0%',
        statType: 'Alert filtering rate',
        timeRange: '30',
      }),
      {}
    );
  });

  it('calls getTimeRangeAsDays with correct parameters', () => {
    render(<FilteringRate {...defaultProps} />);

    expect(mockGetTimeRangeAsDays).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
    });
  });

  it('calls formatPercent with correct filteredAlertsPercCompare value', () => {
    render(<FilteringRate {...defaultProps} />);

    expect(mockFormatPercent).toHaveBeenCalledWith(defaultProps.filteredAlertsPercCompare);
  });
});
