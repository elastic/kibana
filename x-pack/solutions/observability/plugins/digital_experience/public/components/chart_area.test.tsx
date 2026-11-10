/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ChartArea } from './chart_area';

const renderArea = (props: Partial<React.ComponentProps<typeof ChartArea>> = {}) =>
  render(
    <ChartArea
      height={128}
      isLoading={false}
      hasData
      emptyMessage="No data in the time range"
      {...props}
    >
      <div data-test-subj="chart" />
    </ChartArea>,
    { wrapper: EuiProvider }
  );

describe.each([
  ['with a fixed height', false],
  ['growing in a flex column', true],
])('ChartArea %s', (_, grow) => {
  it('shows its chart when there is data', () => {
    renderArea({ grow });

    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });

  it('shows the message instead of the chart without data', () => {
    renderArea({ grow, hasData: false });

    expect(screen.getByText('No data in the time range')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });

  it('shows neither the chart nor the message while loading', () => {
    renderArea({ grow, isLoading: true, hasData: false });

    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
    expect(screen.queryByText('No data in the time range')).not.toBeInTheDocument();
  });
});

describe('ChartArea height', () => {
  it('is the given height when it does not grow', () => {
    const { container } = renderArea();

    expect(container.firstElementChild).toHaveStyle({ blockSize: '128px' });
  });

  it('is at least the given height, and takes the room left, when it grows', () => {
    const { container } = renderArea({ grow: true });

    expect(container.firstElementChild).toHaveStyle({ minBlockSize: '128px', flex: '1 1 0' });
  });
});
