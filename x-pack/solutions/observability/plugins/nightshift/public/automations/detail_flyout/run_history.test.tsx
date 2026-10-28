/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RunHistory, type Run } from './run_history';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const skippedRun = (skipReason: string, dailyLimit?: number): Run => ({
  id: 'run-1',
  status: 'skipped',
  startedAt: '2026-01-01T12:00:00.000Z',
  triggeredBy: 'alerting.v1.alertStatusChanged',
  skipReason,
  dailyLimit,
});

describe('RunHistory skipped run summary', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        charts: { theme: { useChartsBaseTheme: () => ({}), useSparklineOverrides: () => ({}) } },
      },
    });
  });

  const renderRunHistory = (run: Run) =>
    render(
      <I18nProvider>
        <RunHistory
          runs={[run]}
          isLoading={false}
          startedAfter="2026-01-01T00:00:00.000Z"
          startedBefore="2026-01-02T00:00:00.000Z"
          rangeLabel="Last 24 hours"
          automationName="Alert triage"
          onSelect={jest.fn()}
        />
      </I18nProvider>
    );

  it('explains a no_open_investigation skip instead of the daily limit', () => {
    renderRunHistory(skippedRun('no_open_investigation'));

    expect(
      screen.getByText(
        'alerting.v1.alertStatusChanged · Alert recovered with no open investigations to link it to'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Daily trigger limit/)).not.toBeInTheDocument();
  });

  it('keeps the daily limit summary for a daily_limit skip', () => {
    renderRunHistory(skippedRun('daily_limit', 20));

    expect(
      screen.getByText('alerting.v1.alertStatusChanged · Daily trigger limit of 20 reached')
    ).toBeInTheDocument();
  });

  it('keeps the investigation limit summary for an investigation_limit skip', () => {
    renderRunHistory(skippedRun('investigation_limit'));

    expect(
      screen.getByText(
        'alerting.v1.alertStatusChanged · Deployment-wide investigation limit reached'
      )
    ).toBeInTheDocument();
  });
});
