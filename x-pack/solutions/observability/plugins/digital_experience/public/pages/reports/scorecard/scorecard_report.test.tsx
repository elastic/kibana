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
import type { ScorecardReport as ScorecardReportData } from '../../../../common/types/scorecard';
import { useFormatters } from '../../../hooks/use_formatters';
import { ScorecardReport } from './scorecard_report';
import { useScorecardReport } from './use_scorecard_report';

jest.mock('./use_scorecard_report');
jest.mock('../../../hooks/use_formatters');
jest.mock('../../../components/application_tab_toolbar', () => {
  return {
    ApplicationTabToolbar: () => <div data-test-subj="toolbar" />,
  };
});

const useScorecardReportMock = jest.mocked(useScorecardReport);

const REPORT: ScorecardReportData = {
  serviceName: 'shop',
  environments: ['production'],
  period: { start: 2000, end: 3000 },
  previousPeriod: { start: 1000, end: 2000 },
  baselinePeriod: { start: -2000, end: 2000 },
  coreWebVitals: {
    current: { status: 'failed', failing: ['lcp'] },
    previous: { status: 'passed', failing: [] },
  },
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
          changeUnit: 'relative',
          direction: 'neutral',
          baseline: 1000,
          baselineChange: 0.2,
          sampleCount: null,
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
          changeUnit: 'relative',
          direction: 'better',
          baseline: 1250,
          baselineChange: 0.2,
          sampleCount: 1150,
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
          id: 'lcp',
          label: 'Largest Contentful Paint (p75)',
          unit: 'ms',
          value: 3000,
          previous: 2400,
          change: 0.25,
          changeUnit: 'relative',
          direction: 'worse',
          baseline: null,
          baselineChange: null,
          sampleCount: 800,
          rating: 'needsImprovement',
          ratings: { good: 0.6, needsImprovement: 0.3, poor: 0.1 },
        },
        {
          id: 'inp',
          label: 'Interaction to Next Paint (p75)',
          unit: 'ms',
          value: null,
          previous: null,
          change: null,
          changeUnit: 'relative',
          direction: 'unknown',
          baseline: null,
          baselineChange: null,
          sampleCount: 0,
          rating: null,
          ratings: null,
        },
      ],
    },
  ],
};

const refresh = jest.fn();

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

  it('shows the empty cell for a measure without data', () => {
    renderReport();

    const inp = screen.getByTestId('digitalExperienceScorecardMeasure-inp');
    // This period, rating, good samples, previous period, change and baseline.
    expect(within(inp).getAllByText('—')).toHaveLength(6);
  });

  it("shows each web vital's rating and share of good samples", () => {
    renderReport();

    const lcp = screen.getByTestId('digitalExperienceScorecardMeasure-lcp');
    expect(lcp).toHaveTextContent('Needs improvement');
    expect(lcp).toHaveTextContent('60.0%');
  });

  it('shows the baseline with the change from it, and the samples behind the value', () => {
    renderReport();

    const loadTime = screen.getByTestId('digitalExperienceScorecardMeasure-loadTime');
    expect(loadTime).toHaveTextContent('1.25 s');
    expect(loadTime).toHaveTextContent('(+20.0%)');
    expect(loadTime).toHaveTextContent('1150');
  });

  it('shows the Core Web Vitals assessment of both periods', () => {
    renderReport();

    const assessment = screen.getByTestId('digitalExperienceScorecardAssessment');
    expect(assessment).toHaveAttribute('data-status', 'failed');
    expect(assessment).toHaveTextContent('Fails the Core Web Vitals assessment');
    expect(assessment).toHaveTextContent('Not good at the 75th percentile: LCP.');
    expect(assessment).toHaveTextContent('Previous period: passed.');
  });

  it('names both periods', () => {
    renderReport();

    expect(screen.getByTestId('digitalExperienceScorecardPeriods')).toHaveTextContent(
      'date-2000 – date-3000, compared with date-1000 – date-2000 and with the four periods from date--2000'
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
