/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RunDetail } from './run_detail';
import type { Run } from './run_history';

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { application: { getUrlForApp: () => '/app/nightshift' } } }),
}));

const longUrl = `https://kibana.example.com/app/discover#/?${'a'.repeat(900)}`;

const baseRun: Run = {
  id: 'run-1',
  status: 'succeeded',
  startedAt: '2026-01-01T12:00:00.000Z',
  finishedAt: '2026-01-01T12:05:00.000Z',
  triggeredBy: 'alerting.v1.alertStatusChanged',
  message: longUrl,
};

const renderRunDetail = (run: Run) =>
  render(
    <I18nProvider>
      <RunDetail
        run={run}
        automationName="Alert triage"
        titleId="title"
        headerCss={css``}
        bodyCss={css``}
      />
    </I18nProvider>
  );

const skippedRun: Run = {
  ...baseRun,
  status: 'skipped',
  skipReason: 'daily_limit',
  dailyLimit: 20,
};

describe('RunDetail long values', () => {
  it.each<[string, string, Run]>([
    ['completed', 'automationRunDetails', baseRun],
    ['skipped', 'automationRunSkippedDetails', skippedRun],
  ])('keeps the value column bounded and wrapping for a %s run', (_, testSubj, run) => {
    renderRunDetail(run);

    const list = screen.getByTestId(testSubj);
    expect(list).toHaveStyle({ gridTemplateColumns: 'auto minmax(0, 1fr)' });
    expect(screen.getByText(longUrl)).toHaveStyle({ overflowWrap: 'anywhere' });
  });
});
