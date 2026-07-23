/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { HuntStatusResponse } from '../../../../../common/threat_intelligence/hub';
import { ContinuousHuntStatusStrip } from './continuous_hunt_status_strip';

const mockHttpGet = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: { get: (...args: unknown[]) => mockHttpGet(...args) },
    },
  }),
}));

const baseStatus: HuntStatusResponse = {
  workflow_id: 'threat-intel-continuous-threat-hunt',
  workflow_found: true,
  current_run: null,
  last_run: {
    id: 'run-1',
    status: 'completed',
    started_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
    duration_ms: 18_000,
    triggered_by: 'manual',
  },
  cycle: { reports_hunted: 4, new_findings: 3, environment_hits: 2 },
  totals: { findings: 22, reports_with_findings: 4 },
  activity_24h: new Array(24).fill(0).map((_, i) => (i % 5 === 0 ? 2 : 0)),
  schedule: { every: '4h', armed: false, next_run_at: null },
};

const renderStrip = (status: HuntStatusResponse) => {
  mockHttpGet.mockResolvedValue(status);
  return render(
    <I18nProvider>
      <ContinuousHuntStatusStrip />
    </I18nProvider>
  );
};

describe('ContinuousHuntStatusStrip', () => {
  beforeEach(() => {
    mockHttpGet.mockReset();
  });

  it('renders nothing until the status is fetched and the workflow exists', async () => {
    renderStrip({ ...baseStatus, workflow_found: false });

    await waitFor(() => expect(mockHttpGet).toHaveBeenCalled());
    expect(screen.queryByTestId('threatIntelContinuousHuntStatusStrip')).not.toBeInTheDocument();
  });

  it('renders the new-findings badge with real cycle counts when the last run produced findings', async () => {
    renderStrip(baseStatus);

    expect(
      await screen.findByTestId('threatIntelContinuousHuntNewFindingsBadge')
    ).toHaveTextContent('3 new findings');
    expect(screen.getByTestId('threatIntelContinuousHuntCycleStats')).toHaveTextContent(
      '4 reports hunted'
    );
    expect(screen.getByTestId('threatIntelContinuousHuntEnvHits')).toHaveTextContent(
      '2 with environment hits'
    );
    expect(screen.getByTestId('threatIntelContinuousHuntRunMeta')).toHaveTextContent(
      'Last run 14 min ago'
    );
    // Schedules not armed: on-demand instead of a fake countdown.
    expect(screen.getByTestId('threatIntelContinuousHuntRunMeta')).toHaveTextContent('On-demand');
  });

  it('renders the quiet state when the last completed run wrote no new findings', async () => {
    renderStrip({
      ...baseStatus,
      cycle: { reports_hunted: 4, new_findings: 0, environment_hits: 0 },
    });

    expect(await screen.findByTestId('threatIntelContinuousHuntQuietMessage')).toBeInTheDocument();
    expect(screen.getByTestId('threatIntelContinuousHuntQuietPill')).toBeInTheDocument();
    expect(screen.getByTestId('threatIntelContinuousHuntQuietMessage')).toHaveTextContent(
      '22 known findings across 4 reports'
    );
  });

  it('renders in-flight step progress while a run is executing', async () => {
    renderStrip({
      ...baseStatus,
      current_run: {
        id: 'run-2',
        started_at: new Date(Date.now() - 38 * 1000).toISOString(),
        current_step_id: 'hunt_each_report',
        completed_steps: 2,
        reports_completed: 0,
        reports_total: 10,
      },
    });

    expect(await screen.findByTestId('threatIntelContinuousHuntHuntingTitle')).toHaveTextContent(
      'Hunt in progress'
    );
    expect(screen.getByTestId('threatIntelContinuousHuntHuntingSub')).toHaveTextContent(
      'Working through candidate reports…'
    );
    expect(screen.getByTestId('threatIntelContinuousHuntReportCount')).toHaveTextContent(
      '0 of 10 reports'
    );
    expect(screen.getByTestId('threatIntelContinuousHuntTierProgress')).toBeInTheDocument();
  });

  it('renders Hunting now with the current report title when available', async () => {
    renderStrip({
      ...baseStatus,
      current_run: {
        id: 'run-3',
        started_at: new Date(Date.now() - 15 * 1000).toISOString(),
        current_step_id: 'run_hunt_orchestrator',
        current_report_id: 'report-1',
        current_report_title: 'Recurring contractor IOCs in GitHub supply-chain reporting',
        current_report_index: 3,
        completed_steps: 4,
        reports_completed: 2,
        reports_total: 10,
      },
    });

    expect(await screen.findByTestId('threatIntelContinuousHuntHuntingTitle')).toHaveTextContent(
      'Hunting now: Recurring contractor IOCs in GitHub supply-chain reporting'
    );
    expect(screen.getByTestId('threatIntelContinuousHuntHuntingSub')).toHaveTextContent(
      'Report 3 of 10 · Tier 1 + Tier 2 analysis'
    );
    expect(screen.getByTestId('threatIntelContinuousHuntReportCount')).toHaveTextContent('3 of 10');
  });

  it('renders the failed state when the last run failed', async () => {
    renderStrip({
      ...baseStatus,
      last_run: { ...baseStatus.last_run!, status: 'failed' },
      cycle: { reports_hunted: 0, new_findings: 0, environment_hits: 0 },
    });

    expect(await screen.findByTestId('threatIntelContinuousHuntLeftColumn')).toHaveTextContent(
      'Last hunt failed'
    );
  });
});
