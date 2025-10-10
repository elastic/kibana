/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimeSaved } from './time_saved';
import { TimeSavedMetric } from './time_saved_metric';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays, formatThousands } from './metrics';

// Mock dependencies
jest.mock('./time_saved_metric', () => ({
  TimeSavedMetric: jest.fn(() => <div data-test-subj="mock-time-saved-metric" />),
}));

jest.mock('./compare_percentage', () => ({
  ComparePercentage: jest.fn(() => <div data-test-subj="mock-compare-percentage" />),
}));

jest.mock('./metrics', () => ({
  getTimeRangeAsDays: jest.fn(),
  formatThousands: jest.fn(),
}));

const mockGetTimeRangeAsDays = getTimeRangeAsDays as jest.MockedFunction<typeof getTimeRangeAsDays>;
const mockFormatThousands = formatThousands as jest.MockedFunction<typeof formatThousands>;

const defaultProps = {
  hoursSaved: 120,
  hoursSavedCompare: 100,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  minutesPerAlert: 10,
};

describe('TimeSaved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTimeRangeAsDays.mockReturnValue(`30`);
    mockFormatThousands.mockReturnValue('100');
  });

  it('renders the component with correct structure', () => {
    render(<TimeSaved {...defaultProps} />);

    expect(TimeSavedMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        minutesPerAlert: defaultProps.minutesPerAlert,
        from: defaultProps.from,
        to: defaultProps.to,
      }),
      {}
    );

    expect(ComparePercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        positionForLens: true,
        currentCount: defaultProps.hoursSaved,
        previousCount: defaultProps.hoursSavedCompare,
        stat: '100',
        statType: 'time saved in hours',
        timeRange: `30`,
      }),
      {}
    );
  });

  it('calls getTimeRangeAsDays with correct parameters', () => {
    render(<TimeSaved {...defaultProps} />);

    expect(mockGetTimeRangeAsDays).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
    });
  });

  it('calls formatThousands with correct hoursSavedCompare value', () => {
    render(<TimeSaved {...defaultProps} />);

    expect(mockFormatThousands).toHaveBeenCalledWith(defaultProps.hoursSavedCompare);
  });

  it('memoizes timerange calculation based on from and to props', () => {
    const { rerender } = render(<TimeSaved {...defaultProps} />);
    jest.clearAllMocks();
    rerender(<TimeSaved {...defaultProps} />);
    expect(mockGetTimeRangeAsDays).not.toHaveBeenCalled();
    rerender(
      <TimeSaved {...defaultProps} from="2023-02-01T00:00:00.000Z" to="2023-02-28T23:59:59.999Z" />
    );

    expect(mockGetTimeRangeAsDays).toHaveBeenCalledWith({
      from: '2023-02-01T00:00:00.000Z',
      to: '2023-02-28T23:59:59.999Z',
    });
  });
});
