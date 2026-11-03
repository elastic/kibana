/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../../utils/test_helper';
import { CoreVitalItem, getValueStatusIndex } from './core_vital_item';
import {
  NO_DATA,
  LEGEND_GOOD_LABEL,
  LEGEND_NEEDS_IMPROVEMENT_LABEL,
  LEGEND_POOR_LABEL,
} from './translations';

describe('CoreVitalItem', () => {
  const value = '0.005';
  const title = 'Cumulative Layout Shift';
  const thresholds = { bad: '0.25', good: '0.1', goodValue: 0.1, badValue: 0.25 };
  const loading = false;
  const helpLabel = 'sample help label';

  it('renders if value is truthy', () => {
    const { getByText, getByTestId } = render(
      <CoreVitalItem
        title={title}
        value={value}
        ranks={[85, 10, 5]}
        loading={loading}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(getByText(title)).toBeInTheDocument();
    expect(getByText(value)).toBeInTheDocument();

    expect(getByTestId(`${LEGEND_GOOD_LABEL}-85`)).toBeInTheDocument();
    expect(getByTestId(`${LEGEND_NEEDS_IMPROVEMENT_LABEL}-10`)).toBeInTheDocument();
    expect(getByTestId(`${LEGEND_POOR_LABEL}-5`)).toBeInTheDocument();
  });

  it('renders loading state when loading is truthy', () => {
    const { queryByText, getByText } = render(
      <CoreVitalItem
        title={title}
        value={value}
        ranks={[85, 10, 5]}
        loading={true}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(queryByText(value)).not.toBeInTheDocument();
    expect(getByText('--')).toBeInTheDocument();
  });

  it('renders no data UI if value is falsey and loading is falsey', () => {
    const { getByText } = render(
      <CoreVitalItem
        title={title}
        value={null}
        ranks={[85, 10, 5]}
        loading={loading}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(getByText(NO_DATA)).toBeInTheDocument();
  });
});

describe('getValueStatusIndex', () => {
  // ms boundaries for LCP, unitless for CLS.
  const lcpThresholds = { good: '2.5s', bad: '4.0s', goodValue: 2500, badValue: 4000 };
  const clsThresholds = { good: '0.1', bad: '0.25', goodValue: 0.1, badValue: 0.25 };

  it('returns 0 (good) when the value is at or below the good threshold', () => {
    expect(getValueStatusIndex(1200, lcpThresholds)).toBe(0);
    expect(getValueStatusIndex(2500, lcpThresholds)).toBe(0);
    expect(getValueStatusIndex(0.05, clsThresholds)).toBe(0);
  });

  it('returns 1 (needs improvement) when the value is between the thresholds', () => {
    expect(getValueStatusIndex(3000, lcpThresholds)).toBe(1);
    expect(getValueStatusIndex(0.15, clsThresholds)).toBe(1);
  });

  it('returns 2 (poor) when the value is at or above the bad threshold', () => {
    // Regression for the "always green" bug: a poor percentile value must not
    // be classified as good just because most users fall in the good bucket.
    expect(getValueStatusIndex(13660, lcpThresholds)).toBe(2);
    expect(getValueStatusIndex(4000, lcpThresholds)).toBe(2);
    expect(getValueStatusIndex(0.3, clsThresholds)).toBe(2);
  });

  it('returns null when there is no value to classify', () => {
    expect(getValueStatusIndex(null, lcpThresholds)).toBeNull();
    expect(getValueStatusIndex(undefined, lcpThresholds)).toBeNull();
  });
});
