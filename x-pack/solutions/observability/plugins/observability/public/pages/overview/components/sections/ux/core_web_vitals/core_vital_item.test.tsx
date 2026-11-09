/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../../utils/test_helper';
import { CoreVitalItem } from './core_vital_item';
import {
  NO_DATA,
  LEGEND_GOOD_LABEL,
  LEGEND_NEEDS_IMPROVEMENT_LABEL,
  LEGEND_POOR_LABEL,
} from './translations';

describe('CoreVitalItem', () => {
  const value = '0.005';
  const title = 'Cumulative Layout Shift';
  const thresholds = { bad: '0.25', good: '0.1' };
  const loading = false;
  const helpLabel = 'sample help label';
  const legendShare = new RegExp(
    `^(${LEGEND_GOOD_LABEL}|${LEGEND_NEEDS_IMPROVEMENT_LABEL}|${LEGEND_POOR_LABEL})-`
  );

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
    const { queryByText, getByText, getAllByText, queryAllByTestId } = render(
      <CoreVitalItem
        title={title}
        value={value}
        rating="poor"
        ranks={[85, 10, 5]}
        loading={true}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(queryByText(value)).not.toBeInTheDocument();
    expect(getByText('--')).toBeInTheDocument();
    expect(getAllByText(/\(\u2011\u2011%\)$/)).toHaveLength(3);
    expect(queryAllByTestId(legendShare)).toEqual([]);
  });

  it('does not invent a distribution when ranks are missing', () => {
    const { getByText, queryAllByTestId } = render(
      <CoreVitalItem
        title={title}
        value={value}
        loading={loading}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(getByText(value)).toBeInTheDocument();
    expect(queryAllByTestId(legendShare)).toEqual([]);
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
