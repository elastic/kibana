/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../../common/mock';
import { ChartSelect } from '.';

describe('ChartSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the chart select tabs', () => {
    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={jest.fn()} />
      </TestProviders>
    );

    expect(screen.getByTestId('chart-select-tabs')).toBeInTheDocument();
    expect(screen.getByTitle('Trend')).toHaveAttribute('aria-pressed', 'true');
  });

  test('changing selection render correctly', () => {
    const setAlertViewSelection = jest.fn();
    const { rerender } = render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={setAlertViewSelection} />
      </TestProviders>
    );

    expect(screen.getByTitle('Trend')).toHaveAttribute('aria-pressed', 'true');

    const treemapButton = screen.getByTitle('Treemap');
    expect(treemapButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(treemapButton);
    expect(setAlertViewSelection).toHaveBeenCalledWith('treemap');

    rerender(
      <TestProviders>
        <ChartSelect alertViewSelection="treemap" setAlertViewSelection={setAlertViewSelection} />
      </TestProviders>
    );

    expect(screen.getByTitle('Treemap')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Trend')).toHaveAttribute('aria-pressed', 'false');
  });
});
