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
import type { OverviewPercentile } from '../../../../../common/overview_filters';
import type { ApplicationOverviewKpisResponse } from '../../../../../common/types/overview';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { OverviewKpis } from './overview_kpis';

jest.mock('../../../../hooks/use_kibana_services');
// The badge's color as an attribute, rather than EUI's generated class names.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiBadge: ({
      color,
      children,
      'data-test-subj': dataTestSubj,
    }: {
      color: string;
      children: React.ReactNode;
      'data-test-subj': string;
    }) => (
      <span data-test-subj={dataTestSubj} data-color={color}>
        {children}
      </span>
    ),
  };
});

const compared = (value: number | null, previous: number | null) => ({
  value,
  previous,
  delta: value !== null && previous !== null ? value - previous : null,
});

const KPIS: ApplicationOverviewKpisResponse = {
  percentile: 75,
  sessions: compared(400, 500),
  errorFreeSessions: compared(0.95, 0.9),
  pageLoads: compared(1533, 1533),
  loadTime: compared(2412.5, 2000),
  jsErrors: compared(42, 30),
  failedHttpRequests: compared(0.125, 0.1),
  requestLatency: compared(180.4, 200),
  counts: {
    sessionsWithErrors: 20,
    loadTimeSamples: 1500,
    httpRequests: 400,
    failedHttpRequests: 50,
  },
};

const renderKpis = ({
  kpis = KPIS,
  isLoading = false,
  isComparing = false,
  percentile = 75,
}: {
  kpis?: ApplicationOverviewKpisResponse;
  isLoading?: boolean;
  isComparing?: boolean;
  percentile?: OverviewPercentile;
} = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <OverviewKpis
          kpis={isLoading ? undefined : kpis}
          percentile={percentile}
          isComparing={isComparing}
          isLoading={isLoading}
        />
      </EuiProvider>
    </I18nProvider>
  );

const kpi = (name: string) => screen.getByTestId(`digitalExperienceOverview${name}`);

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('OverviewKpis', () => {
  it('shows every metric with its unit', () => {
    renderKpis();

    expect(kpi('Sessions')).toHaveTextContent('400');
    expect(kpi('ErrorFreeSessions')).toHaveTextContent('95%');
    expect(kpi('PageLoads')).toHaveTextContent('1,533');
    expect(kpi('LoadTime')).toHaveTextContent('2.41 s');
    expect(kpi('LoadTime')).toHaveTextContent('Load time (p75)');
    expect(kpi('JsErrors')).toHaveTextContent('42');
    expect(kpi('FailedHttp')).toHaveTextContent('12.5%');
    expect(kpi('RequestLatency')).toHaveTextContent('180 ms');
  });

  it('names the percentile the load time is at', () => {
    renderKpis({ percentile: 95 });

    expect(kpi('LoadTime')).toHaveTextContent('Load time (p95)');
  });

  it('says there is not enough data where nothing was measured, not a zero', () => {
    renderKpis({
      kpis: {
        ...KPIS,
        loadTime: compared(null, null),
        failedHttpRequests: compared(null, null),
      },
    });

    expect(kpi('LoadTime')).toHaveTextContent('Not enough data');
    expect(kpi('FailedHttp')).toHaveTextContent('Not enough data');
  });

  it('shows no change while Compare is off', () => {
    renderKpis();

    expect(screen.queryByTestId('digitalExperienceOverviewSessionsChange')).not.toBeInTheDocument();
  });

  it('colors each change by whether it went the better way', () => {
    renderKpis({ isComparing: true });

    // Traffic is neither better nor worse.
    expect(kpi('SessionsChange')).toHaveTextContent('-20%');
    expect(kpi('SessionsChange')).toHaveAttribute('data-color', 'hollow');
    // Shares change in percentage points.
    expect(kpi('ErrorFreeSessionsChange')).toHaveTextContent('+5 pp');
    expect(kpi('ErrorFreeSessionsChange')).toHaveAttribute('data-color', 'success');
    expect(kpi('LoadTimeChange')).toHaveAttribute('data-color', 'danger');
    expect(kpi('JsErrorsChange')).toHaveAttribute('data-color', 'danger');
    expect(kpi('FailedHttpChange')).toHaveTextContent('+2.5 pp');
    expect(kpi('RequestLatencyChange')).toHaveAttribute('data-color', 'success');
    // Unchanged reads as none.
    expect(kpi('PageLoadsChange')).toHaveTextContent('0%');
  });

  it('shows no values while loading', () => {
    renderKpis({ isLoading: true });

    expect(screen.queryByText('1,533')).not.toBeInTheDocument();
    expect(screen.queryByText('2.41 s')).not.toBeInTheDocument();
  });
});
