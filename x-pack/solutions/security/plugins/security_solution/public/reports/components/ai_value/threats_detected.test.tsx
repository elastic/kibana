/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { ThreatsDetected } from './threats_detected';
import { ThreatsDetectedMetric } from './threats_detected_metric';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays } from './metrics';

// Mock dependencies
vi.mock('./threats_detected_metric', () => {
      const mocked = {
      ThreatsDetectedMetric: vi.fn(() => <div data-test-subj="mock-threats-detected-metric" />),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./compare_percentage', () => {
      const mocked = {
      ComparePercentage: vi.fn(() => <div data-test-subj="mock-compare-percentage" />),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./metrics', () => {
      const mocked = {
      getTimeRangeAsDays: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockGetTimeRangeAsDays = getTimeRangeAsDays as MockedFunction<typeof getTimeRangeAsDays>;

const defaultProps = {
  isSample: false as const,
  attackDiscoveryCount: 25,
  attackDiscoveryCountCompare: 20,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
};

describe('ThreatsDetected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTimeRangeAsDays.mockReturnValue(`30`);
  });

  it('renders the live component with correct structure', () => {
    render(<ThreatsDetected {...defaultProps} />);

    expect(ThreatsDetectedMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        from: defaultProps.from,
        to: defaultProps.to,
      }),
      {}
    );

    expect(ComparePercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        currentCount: defaultProps.attackDiscoveryCount,
        positionForLens: true,
        previousCount: defaultProps.attackDiscoveryCountCompare,
        stat: `${defaultProps.attackDiscoveryCountCompare}`,
        statType: 'attack discovery count',
        timeRange: `30`,
      }),
      {}
    );
  });

  it('renders the sample component with correct structure', () => {
    const sampleProps = { ...defaultProps, isSample: true };
    render(<ThreatsDetected {...sampleProps} />);

    expect(ThreatsDetectedMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        isSample: true,
        from: defaultProps.from,
        to: defaultProps.to,
      }),
      {}
    );

    expect(ComparePercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        currentCount: defaultProps.attackDiscoveryCount,
        positionForLens: true,
        previousCount: defaultProps.attackDiscoveryCountCompare,
        stat: `${defaultProps.attackDiscoveryCountCompare}`,
        statType: 'attack discovery count',
        timeRange: `30`,
      }),
      {}
    );
  });

  it('calls getTimeRangeAsDays with correct parameters', () => {
    render(<ThreatsDetected {...defaultProps} />);

    expect(mockGetTimeRangeAsDays).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
    });
  });

  it('passes correct time range to both child components', () => {
    const customTimeRange = `45`;
    mockGetTimeRangeAsDays.mockReturnValue(customTimeRange);

    render(<ThreatsDetected {...defaultProps} />);

    expect(ComparePercentage).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: customTimeRange,
      }),
      {}
    );
  });
});
