/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, within } from '@testing-library/react';
import React from 'react';
import { ProgressBarRow } from './alerts_progress_bar_row';
import type { AlertsProgressBarData } from './types';

describe('ProgressBarRow', () => {
  it('should render label value when key is Other', () => {
    const item: AlertsProgressBarData = {
      key: 'Other',
      value: 1,
      percentage: 50,
      percentageLabel: 'percentageLabel',
      label: 'label',
    };

    const { container } = render(<ProgressBarRow item={item} />);
    // target only the visible label/value, skip the one for screen readers
    const data = within(container.querySelector('.euiProgress__data')!);

    expect(data.getByText('percentageLabel')).toBeInTheDocument();
    expect(data.getByText('label')).toBeInTheDocument();
  });

  it('should render key value when key is not Other', () => {
    const item: AlertsProgressBarData = {
      key: 'key',
      value: 1,
      percentage: 50,
      percentageLabel: 'percentageLabel',
      label: 'label',
    };

    const { container } = render(<ProgressBarRow item={item} />);
    // target only the visible label/value, skip the one for screen readers
    const data = within(container.querySelector('.euiProgress__data')!);

    expect(data.getByText('percentageLabel')).toBeInTheDocument();
    expect(data.getByText('key')).toBeInTheDocument();
  });
});
