/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CostSavings } from './cost_savings';
import { CostSavingsMetric } from './cost_savings_metric';
import { ComparePercentageBadge } from './compare_percentage_badge';
import { getTimeRangeAsDays, formatDollars } from './metrics';

// Mock dependencies
jest.mock('./cost_savings_metric', () => ({
  CostSavingsMetric: jest.fn(() => <div data-test-subj="mock-cost-savings-metric" />),
}));

jest.mock('./compare_percentage_badge', () => ({
  ComparePercentageBadge: jest.fn(() => <div data-test-subj="mock-compare-percentage-badge" />),
}));

jest.mock('./metrics', () => ({
  getTimeRangeAsDays: jest.fn(),
  formatDollars: jest.fn(),
}));

const mockGetTimeRangeAsDays = getTimeRangeAsDays as jest.MockedFunction<typeof getTimeRangeAsDays>;
const mockFormatDollars = formatDollars as jest.MockedFunction<typeof formatDollars>;

const defaultProps = {
  minutesPerAlert: 10,
  analystHourlyRate: 50,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  costSavings: 5000,
  costSavingsCompare: 4000,
};

describe('CostSavings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetTimeRangeAsDays.mockReturnValue('30');
    mockFormatDollars.mockReturnValue('$4,000');
  });

  it('renders the component with correct structure', () => {
    render(<CostSavings {...defaultProps} />);

    expect(CostSavingsMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        from: defaultProps.from,
        to: defaultProps.to,
        analystHourlyRate: defaultProps.analystHourlyRate,
        minutesPerAlert: defaultProps.minutesPerAlert,
      }),
      {}
    );

    expect(ComparePercentageBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        positionForLens: true,
        colorFamily: 'bright',
        currentCount: defaultProps.costSavings,
        previousCount: defaultProps.costSavingsCompare,
        stat: '$4,000',
        statType: 'cost saved in dollars',
        timeRange: '30',
      }),
      {}
    );
  });

  it('calls getTimeRangeAsDays with correct parameters', () => {
    render(<CostSavings {...defaultProps} />);

    expect(mockGetTimeRangeAsDays).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
    });
  });

  it('calls formatDollars with correct costSavingsCompare value', () => {
    render(<CostSavings {...defaultProps} />);

    expect(mockFormatDollars).toHaveBeenCalledWith(defaultProps.costSavingsCompare);
  });

  it('memoizes timerange calculation based on from and to props', () => {
    const { rerender } = render(<CostSavings {...defaultProps} />);
    jest.clearAllMocks();
    rerender(<CostSavings {...defaultProps} />);
    expect(mockGetTimeRangeAsDays).not.toHaveBeenCalled();
    rerender(
      <CostSavings
        {...defaultProps}
        from="2023-02-01T00:00:00.000Z"
        to="2023-02-28T23:59:59.999Z"
      />
    );
    expect(mockGetTimeRangeAsDays).toHaveBeenCalledWith({
      from: '2023-02-01T00:00:00.000Z',
      to: '2023-02-28T23:59:59.999Z',
    });
  });
});
