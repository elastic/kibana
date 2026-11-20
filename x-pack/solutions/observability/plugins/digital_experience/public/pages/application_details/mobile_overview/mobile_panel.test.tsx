/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useFormatters } from '../../../hooks/use_formatters';
import { MobilePanel, relativeChange } from './mobile_panel';

jest.mock('../../../hooks/use_formatters');

const renderPanel = (props: Partial<React.ComponentProps<typeof MobilePanel>> = {}) =>
  render(
    <MobilePanel
      data-test-subj="kpi"
      title="Sessions"
      tooltip="Distinct session.id values."
      value={{ value: 12, previous: 10, delta: 2 }}
      formatValue={(value) => `${value} sessions`}
      isComparing={false}
      isLoading={false}
      discoverHref="/app/discover#/?esql"
      {...props}
    />,
    { wrapper: EuiProvider }
  );

beforeEach(() => {
  jest.mocked(useFormatters).mockReturnValue({
    formatNumber: String,
    formatPercent: (share) => `${Math.round(share * 100)}%`,
    formatDate: String,
    timeZone: 'UTC',
  });
});

describe('relativeChange', () => {
  it('is the change as a share of the previous value', () => {
    expect(relativeChange({ value: 12, previous: 10, delta: 2 })).toBeCloseTo(0.2);
  });

  it('is unknown without a previous value, or against 0', () => {
    expect(relativeChange({ value: 12, previous: null, delta: null })).toBeNull();
    expect(relativeChange({ value: 12, previous: 0, delta: 12 })).toBeNull();
    expect(relativeChange({ value: null, previous: 3, delta: null })).toBeNull();
  });
});

describe('MobilePanel', () => {
  it('shows the value, its change, a tooltip and a Discover link', () => {
    renderPanel();

    expect(screen.getByTestId('kpiValue')).toHaveTextContent('12 sessions');
    expect(screen.getByTestId('kpiChange')).toHaveTextContent('+20%');
    expect(screen.getByTestId('kpiTooltip')).toBeInTheDocument();
    expect(screen.getByTestId('kpiDiscover')).toHaveAttribute('href', '/app/discover#/?esql');
  });

  it('shows "Not enough data" without a value, and no change', () => {
    renderPanel({ value: { value: null, previous: null, delta: null } });

    expect(screen.getByTestId('kpiValue')).toHaveTextContent('Not enough data');
    expect(screen.queryByTestId('kpiChange')).not.toBeInTheDocument();
  });

  it('shows the previous value only while comparing', () => {
    const { rerender } = renderPanel();
    expect(screen.queryByTestId('kpiPrevious')).not.toBeInTheDocument();

    rerender(
      <MobilePanel
        data-test-subj="kpi"
        title="Sessions"
        tooltip="Distinct session.id values."
        value={{ value: 12, previous: 10, delta: 2 }}
        formatValue={(value) => `${value} sessions`}
        isComparing
        isLoading={false}
        discoverHref={undefined}
      />
    );

    expect(screen.getByTestId('kpiPrevious')).toHaveTextContent('Previous period: 10 sessions');
    expect(screen.queryByTestId('kpiDiscover')).not.toBeInTheDocument();
  });
});
