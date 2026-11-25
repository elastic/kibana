/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { createFormatters, useFormatters } from '../hooks/use_formatters';
import { createUiSettingsMock } from '../test_utils/ui_settings_mock';
import { ComparedKpiPanel } from './compared_kpi_panel';

jest.mock('../hooks/use_formatters', () => ({
  ...jest.requireActual('../hooks/use_formatters'),
  useFormatters: jest.fn(),
}));
// The badge's color as an attribute, rather than EUI's generated class names.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiBadge: ({
      color,
      iconType,
      children,
      'data-test-subj': dataTestSubj,
    }: {
      color: string;
      iconType?: string;
      children: React.ReactNode;
      'data-test-subj': string;
    }) => (
      <span data-test-subj={dataTestSubj} data-color={color} data-icon={iconType}>
        {children}
      </span>
    ),
  };
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const renderPanel = (props: Partial<React.ComponentProps<typeof ComparedKpiPanel>> = {}) =>
  render(
    <ComparedKpiPanel
      data-test-subj="kpi"
      title="Sessions"
      tooltip="Distinct session.id values."
      value={{ value: 12, previous: 10, delta: 2 }}
      formatValue={(value) => `${value} sessions`}
      changeUnit="relative"
      // On, as the change shows only then; the last test turns it off.
      isComparing
      isLoading={false}
      {...props}
    />,
    { wrapper: Wrapper }
  );

beforeEach(() => {
  jest.mocked(useFormatters).mockReturnValue(createFormatters(createUiSettingsMock()));
});

describe('ComparedKpiPanel', () => {
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

  it.each([
    ['a rise of what should rise', true, { value: 12, previous: 10, delta: 2 }, 'success'],
    ['a fall of what should rise', true, { value: 8, previous: 10, delta: -2 }, 'danger'],
    ['a rise of what should fall', false, { value: 12, previous: 10, delta: 2 }, 'danger'],
    ['a fall of what should fall', false, { value: 8, previous: 10, delta: -2 }, 'success'],
    ['a change without a better way', undefined, { value: 12, previous: 10, delta: 2 }, 'hollow'],
  ])('colors %s as %s', (_, higherIsBetter, value, color) => {
    renderPanel({ value, higherIsBetter });

    expect(screen.getByTestId('kpiChange')).toHaveAttribute('data-color', color);
  });

  it.each([
    // 99.9999% to 99.9995% crash-free: a real change too small for the digits shown.
    [
      'a share',
      'percentagePoints',
      { value: 0.999995, previous: 0.999999, delta: -0.000004 },
      '0 pp',
    ],
    ['a count', 'relative', { value: 10001, previous: 10000, delta: 1 }, '0%'],
  ] as const)(
    'shows a change of %s that rounds to nothing without a sign, and neither red nor green',
    (_, changeUnit, value, label) => {
      jest.mocked(useFormatters).mockReturnValue(
        createFormatters(
          createUiSettingsMock({
            'format:number:defaultPattern': '0.[0]',
            'format:percent:defaultPattern': '0%',
          })
        )
      );
      renderPanel({ value, changeUnit, higherIsBetter: true });

      expect(screen.getByTestId('kpiChange')).toHaveTextContent(new RegExp(`^${label}$`));
      expect(screen.getByTestId('kpiChange')).toHaveAttribute('data-color', 'hollow');
      expect(screen.getByTestId('kpiChange')).not.toHaveAttribute('data-icon');
    }
  );

  it.each([
    ['a relative change under 2%', 'relative', { value: 1015, previous: 1000, delta: 15 }],
    [
      'a share change under 0.5 pp',
      'percentagePoints',
      { value: 0.424, previous: 0.42, delta: 0.004 },
    ],
  ] as const)(
    'shows %s with its arrow but neither red nor green, as noise',
    (_, changeUnit, value) => {
      renderPanel({ value, changeUnit, higherIsBetter: true });

      expect(screen.getByTestId('kpiChange')).toHaveAttribute('data-color', 'hollow');
      expect(screen.getByTestId('kpiChange')).toHaveAttribute('data-icon', 'sortUp');
    }
  );

  it('points the arrow the way the value went, whatever its color', () => {
    const { unmount } = renderPanel({ higherIsBetter: false });
    expect(screen.getByTestId('kpiChange')).toHaveAttribute('data-icon', 'sortUp');
    unmount();

    renderPanel({ value: { value: 8, previous: 10, delta: -2 }, higherIsBetter: false });
    expect(screen.getByTestId('kpiChange')).toHaveAttribute('data-icon', 'sortDown');
  });

  it('shows the previous value briefly, and in full in its tooltip', async () => {
    renderPanel();

    expect(screen.getByTestId('kpiPrevious')).toHaveTextContent(/^vs 10 sessions$/);
    fireEvent.mouseOver(screen.getByTestId('kpiPrevious'));
    expect(await screen.findByText('Previous period: 10 sessions')).toBeInTheDocument();
  });

  it('shows the change and the previous value only while comparing, so the toggle means both', () => {
    const { unmount } = renderPanel({ isComparing: false });
    expect(screen.getByTestId('kpiValue')).toHaveTextContent('12 sessions');
    expect(screen.queryByTestId('kpiChange')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kpiPrevious')).not.toBeInTheDocument();
    unmount();

    renderPanel({ isComparing: true });
    expect(screen.getByTestId('kpiChange')).toHaveTextContent('+20%');
    expect(screen.getByTestId('kpiPrevious')).toHaveTextContent('vs 10 sessions');
  });
});
