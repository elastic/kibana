/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnomalySeverityFilter } from './anomaly_severity_filter';
import type { AnomalyBand } from './anomaly_bands';

const bands: AnomalyBand[] = [
  { start: 0, end: 3, color: 'grey', hidden: false },
  { start: 3, end: 25, color: 'blue', hidden: true },
];

describe('AnomalySeverityFilter', () => {
  it('renders each band as a toggle button inside a labelled group', () => {
    render(<AnomalySeverityFilter anomalyBands={bands} toggleHiddenBand={jest.fn()} />);

    expect(screen.getByRole('group', { name: 'Anomaly score' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0-3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '3-25' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles a band with the keyboard', async () => {
    const toggleHiddenBand = jest.fn();
    render(<AnomalySeverityFilter anomalyBands={bands} toggleHiddenBand={toggleHiddenBand} />);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: '0-3' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(toggleHiddenBand).toHaveBeenCalledWith(bands[0]);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: '3-25' })).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(toggleHiddenBand).toHaveBeenCalledWith(bands[1]);
  });
});
