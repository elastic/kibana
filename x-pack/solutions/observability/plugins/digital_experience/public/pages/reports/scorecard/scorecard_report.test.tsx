/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import {
  DIGITAL_EXPERIENCE_FEATURE_ID,
  DIGITAL_EXPERIENCE_UI_PRIVILEGES,
} from '../../../../common/feature';
import type { ScorecardReport as ScorecardReportData } from '../../../../common/types/scorecard';
import { useFormatters } from '../../../hooks/use_formatters';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useEmailConnectors } from '../scheduled/use_email_connectors';
import { ScorecardReport } from './scorecard_report';
import { useScorecardReport } from './use_scorecard_report';

jest.mock('./use_scorecard_report');
jest.mock('../../../hooks/use_formatters');
jest.mock('../../../hooks/use_kibana_services');
jest.mock('../scheduled/use_email_connectors');
jest.mock('../../../hooks/use_environment', () => ({
  useEnvironment: () => ({ environment: 'production', setEnvironment: jest.fn() }),
}));
jest.mock('./schedule_report_button', () => ({
  ScheduleReportButton: ({ serviceName, environment }: Record<string, string>) => (
    <button data-test-subj="schedule">{`${serviceName}/${environment}`}</button>
  ),
}));
jest.mock('../../../components/application_tab_toolbar', () => {
  return {
    ApplicationTabToolbar: ({ actions }: { actions?: React.ReactNode }) => {
      return <div data-test-subj="toolbar">{actions}</div>;
    },
  };
});

const useScorecardReportMock = jest.mocked(useScorecardReport);

const REPORT: ScorecardReportData = {
  serviceName: 'shop',
  environments: ['production'],
  period: { start: 2000, end: 3000 },
  previousPeriod: { start: 1000, end: 2000 },
  generatedAt: 4000,
  sections: [
    {
      id: 'traffic',
      title: 'Traffic and errors',
      measures: [
        {
          id: 'pageLoads',
          label: 'Page loads',
          unit: 'count',
          value: 1200,
          previous: 1000,
          change: 0.2,
          direction: 'neutral',
          rating: null,
          ratings: null,
        },
        {
          id: 'loadTime',
          label: 'Page load time (p75)',
          unit: 'ms',
          value: 1500,
          previous: 2000,
          change: -0.25,
          direction: 'better',
          rating: null,
          ratings: null,
        },
      ],
    },
    {
      id: 'webVitals',
      title: 'Core Web Vitals',
      measures: [
        {
          id: 'inp',
          label: 'Interaction to Next Paint (p75)',
          unit: 'ms',
          value: null,
          previous: null,
          change: null,
          direction: 'unknown',
          rating: null,
          ratings: null,
        },
      ],
    },
  ],
};

const refresh = jest.fn();

const setCapabilities = (canManage: boolean) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      capabilities: {
        [DIGITAL_EXPERIENCE_FEATURE_ID]: {
          [DIGITAL_EXPERIENCE_UI_PRIVILEGES.show]: true,
          [DIGITAL_EXPERIENCE_UI_PRIVILEGES.save]: canManage,
        },
      },
    },
  } as never);
};

const renderReport = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ScorecardReport serviceName="shop" />
      </EuiProvider>
    </I18nProvider>
  );

describe('ScorecardReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCapabilities(true);
    jest.mocked(useFormatters).mockReturnValue({
      formatNumber: (value) => String(value),
      formatPercent: (share) => `${(share * 100).toFixed(1)}%`,
      formatErrorRate: (rate) => String(rate),
      formatDecimal: (value, decimals) => value.toFixed(decimals),
      formatKpiPercent: (share) => `${(share * 100).toFixed(1)}%`,
      formatSignedNumber: (value) => String(value),
      formatSignedPercent: (share) => `${share > 0 ? '+' : ''}${(share * 100).toFixed(1)}%`,
      formatDate: (date) => `date-${date}`,
      timeZone: 'UTC',
    });
    jest.mocked(useEmailConnectors).mockReturnValue({
      available: true,
      emailConnectors: [],
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    });
    useScorecardReportMock.mockReturnValue({
      response: REPORT,
      isLoading: false,
      error: undefined,
      refresh,
    });
  });

  it('shows each measure next to the previous period, with its change', () => {
    renderReport();

    const loadTime = screen.getByTestId('digitalExperienceScorecardMeasure-loadTime');
    expect(loadTime).toHaveTextContent('1.50 s');
    expect(loadTime).toHaveTextContent('2.00 s');
    expect(loadTime).toHaveTextContent('-25.0%');
    expect(within(loadTime).getByText('Better')).toBeInTheDocument();
  });

  it('shows no verdict for a change that is neither better nor worse', () => {
    renderReport();

    const pageLoads = screen.getByTestId('digitalExperienceScorecardMeasure-pageLoads');
    expect(pageLoads).toHaveTextContent('+20.0%');
    expect(within(pageLoads).queryByText('Better')).not.toBeInTheDocument();
    expect(within(pageLoads).queryByText('Worse')).not.toBeInTheDocument();
  });

  it('shows a dash for a measure without data', () => {
    renderReport();

    expect(screen.getByTestId('digitalExperienceScorecardMeasure-inp')).toHaveTextContent('–');
  });

  it('names both periods', () => {
    renderReport();

    expect(screen.getByTestId('digitalExperienceScorecardPeriods')).toHaveTextContent(
      'date-2000 – date-3000, compared with date-1000 – date-2000'
    );
  });

  it('shows the error and loads again on retry', () => {
    useScorecardReportMock.mockReturnValue({
      response: undefined,
      isLoading: false,
      error: new Error('boom'),
      refresh,
    });
    renderReport();

    expect(screen.getByTestId('digitalExperienceScorecardError')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('digitalExperienceScorecardRetry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('offers to schedule the report of the selected environment', () => {
    renderReport();

    expect(within(screen.getByTestId('toolbar')).getByTestId('schedule')).toHaveTextContent(
      'shop/production'
    );
  });

  it('hides Schedule report when the user lacks manage capability or Workflows is unavailable', () => {
    setCapabilities(false);
    const { rerender } = renderReport();
    expect(screen.queryByTestId('schedule')).not.toBeInTheDocument();

    setCapabilities(true);
    jest.mocked(useEmailConnectors).mockReturnValue({
      available: false,
      emailConnectors: [],
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    });
    rerender(
      <I18nProvider>
        <EuiProvider>
          <ScorecardReport serviceName="shop" />
        </EuiProvider>
      </I18nProvider>
    );
    expect(screen.queryByTestId('schedule')).not.toBeInTheDocument();
  });

  it('shows a spinner while the report loads', () => {
    useScorecardReportMock.mockReturnValue({
      response: undefined,
      isLoading: true,
      error: undefined,
      refresh,
    });
    renderReport();

    expect(screen.getByTestId('digitalExperienceScorecardLoading')).toBeInTheDocument();
  });
});
