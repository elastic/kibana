/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ContinuousHuntStatusResponse } from '../../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../../common/lib/kibana';
import { ContinuousHuntStatusStrip } from './continuous_hunt_status_strip';

jest.mock('../../../../common/lib/kibana');

const idleNewFindings: ContinuousHuntStatusResponse = {
  phase: 'idle',
  workflow_enabled: true,
  last_completed_at: '2026-07-23T11:00:00.000Z',
  next_run_at: '2026-07-23T15:00:00.000Z',
  reports_hunted_last_cycle: 4,
  findings: { new_count: 3, suppressed_count: 1 },
  sparkline_24h: Array.from({ length: 24 }, (_, i) => (i % 3) + 1),
};

const idleQuiet: ContinuousHuntStatusResponse = {
  ...idleNewFindings,
  findings: { new_count: 0, suppressed_count: 0 },
};

const hunting: ContinuousHuntStatusResponse = {
  phase: 'hunting',
  workflow_enabled: true,
  workflow_execution_id: 'exec-1',
  started_at: '2026-07-23T11:55:00.000Z',
  last_completed_at: '2026-07-23T08:00:00.000Z',
  next_run_at: '2026-07-23T16:00:00.000Z',
  reports_hunted_last_cycle: 2,
  report: {
    id: 'r-b',
    title: 'Live Okta campaign',
    index: 2,
    total: 4,
  },
  tier: {
    current: 1,
    total: 2,
    label: 'Running Tier 1 and Tier 2…',
  },
  findings: { new_count: 0, suppressed_count: 0 },
  sparkline_24h: Array.from({ length: 24 }, () => 0),
};

const renderStrip = () =>
  render(
    <I18nProvider>
      <ContinuousHuntStatusStrip />
    </I18nProvider>
  );

describe('ContinuousHuntStatusStrip', () => {
  const httpGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useKibana).mockReturnValue({
      services: { http: { get: httpGet } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    cleanup();
  });

  it('returns the loading skeleton before the first status response', () => {
    httpGet.mockReturnValue(new Promise(() => undefined));
    renderStrip();
    expect(screen.getByTestId('threatIntelContinuousHuntStatusStrip-loading')).toBeInTheDocument();
  });

  it('returns the new findings badge from the live status response', async () => {
    httpGet.mockResolvedValue(idleNewFindings);
    renderStrip();
    await waitFor(() => {
      expect(screen.getByTestId('threatIntelContinuousHuntNewFindingsBadge')).toHaveTextContent(
        '3 new findings'
      );
    });
  });

  it('returns the suppressed duplicate count from the live status response', async () => {
    httpGet.mockResolvedValue(idleNewFindings);
    renderStrip();
    await waitFor(() => {
      expect(screen.getByTestId('threatIntelContinuousHuntSuppressed')).toHaveTextContent(
        '1 duplicate suppressed'
      );
    });
  });

  it('returns the quiet cycle message when there are no new findings', async () => {
    httpGet.mockResolvedValue(idleQuiet);
    renderStrip();
    await waitFor(() => {
      expect(screen.getByTestId('threatIntelContinuousHuntQuietMessage')).toBeInTheDocument();
    });
  });

  it('returns the hunting title from the live report', async () => {
    httpGet.mockResolvedValue(hunting);
    renderStrip();
    await waitFor(() => {
      expect(screen.getByTestId('threatIntelContinuousHuntHuntingTitle')).toHaveTextContent(
        'Hunting now: Live Okta campaign'
      );
    });
  });

  it('returns report progress from the live status response', async () => {
    httpGet.mockResolvedValue(hunting);
    renderStrip();
    await waitFor(() => {
      expect(screen.getByTestId('threatIntelContinuousHuntReportProgress')).toHaveTextContent(
        'Report 2 of 4'
      );
    });
  });

  it('returns status unavailable when the first fetch fails', async () => {
    httpGet.mockRejectedValue(new Error('boom'));
    renderStrip();
    await waitFor(() => {
      expect(screen.getByTestId('threatIntelContinuousHuntStatusStrip-error')).toBeInTheDocument();
    });
  });
});
