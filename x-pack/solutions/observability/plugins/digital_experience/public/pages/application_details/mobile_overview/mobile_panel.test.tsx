/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { useFormatters } from '../../../hooks/use_formatters';
import { MobilePanel } from './mobile_panel';

jest.mock('../../../hooks/use_formatters');

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const renderPanel = (props: Partial<React.ComponentProps<typeof MobilePanel>> = {}) =>
  render(
    <MobilePanel
      data-test-subj="kpi"
      title="Sessions"
      tooltip="Distinct session.id values."
      value={{ value: 12, previous: 10, delta: 2 }}
      formatValue={(value) => `${value} sessions`}
      changeUnit="relative"
      isComparing={false}
      isLoading={false}
      {...props}
    />,
    { wrapper: Wrapper }
  );

beforeEach(() => {
  jest.mocked(useFormatters).mockReturnValue({
    formatNumber: String,
    formatPercent: (share) => `${Math.round(share * 100)}%`,
    formatDate: String,
    timeZone: 'UTC',
  });
});

describe('MobilePanel', () => {
  it('shows the value, its change and a tooltip', () => {
    renderPanel();

    expect(screen.getByTestId('kpiValue')).toHaveTextContent('12 sessions');
    expect(screen.getByTestId('kpiChange')).toHaveTextContent('+20%');
    expect(screen.getByTestId('kpiHint')).toBeInTheDocument();
  });

  it('shows "Not enough data" without a value, and no change', () => {
    renderPanel({ value: { value: null, previous: null, delta: null } });

    expect(screen.getByTestId('kpiValue')).toHaveTextContent('Not enough data');
    expect(screen.queryByTestId('kpiChange')).not.toBeInTheDocument();
  });

  it('shows the change of a share in percentage points', () => {
    renderPanel({
      value: { value: 0.99, previous: 0.98, delta: 0.01 },
      changeUnit: 'percentagePoints',
    });

    expect(screen.getByTestId('kpiChange')).toHaveTextContent('+1 pp');
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
        changeUnit="relative"
        isComparing
        isLoading={false}
      />
    );

    expect(screen.getByTestId('kpiPrevious')).toHaveTextContent('Previous period: 10 sessions');
  });
});
