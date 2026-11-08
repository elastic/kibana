/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  buildSeverityTrendSeries,
  formatSeverityTrendAgeLabel,
  formatSeverityTrendStartLabel,
  SEVERITY_TREND_WINDOW_MS,
} from './severity_tiles_trend';

const makeInvestigation = (
  id: string,
  overrides: Partial<InvestigationSummary> & {
    severity?: InvestigationSummary['metadata']['severity'];
    status?: 'open' | 'closed';
    created_at?: string;
    updated_at?: string;
  } = {}
): InvestigationSummary => ({
  id,
  title: id,
  title_pending: false,
  created_at: overrides.created_at ?? '2026-11-06T10:00:00.000Z',
  updated_at: overrides.updated_at ?? overrides.created_at ?? '2026-11-06T10:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: {
    status: overrides.status ?? 'open',
    severity: overrides.severity ?? 'critical',
  },
  in_progress: false,
  subjects: [],
});

describe('severity_tiles_trend', () => {
  const nowMs = Date.parse('2026-11-06T22:00:00.000Z');

  it('counts investigations by open date, including opens before the window', () => {
    const series = buildSeverityTrendSeries({
      investigations: [
        makeInvestigation('old-open', {
          status: 'open',
          created_at: new Date(nowMs - SEVERITY_TREND_WINDOW_MS - 60 * 60 * 1000).toISOString(),
        }),
        makeInvestigation('mid-window', {
          status: 'closed',
          created_at: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(nowMs - 60 * 60 * 1000).toISOString(),
        }),
        makeInvestigation('just-opened', {
          status: 'open',
          created_at: new Date(nowMs - 30 * 60 * 1000).toISOString(),
        }),
      ],
      currentCount: 2,
      nowMs,
    });

    expect(series[0]?.time).toBe(nowMs - SEVERITY_TREND_WINDOW_MS);
    // Older open is already counted at the left edge of the window.
    expect(series[0]?.value).toBe(1);

    const fiveHoursAgo = series.find((point) => point.time === nowMs - 5 * 60 * 60 * 1000);
    expect(fiveHoursAgo?.value).toBe(2);

    // Live tile count wins at “now”.
    expect(series[series.length - 1]).toEqual({ time: nowMs, value: 2 });
  });

  it('formats relative age labels like the prototype axis', () => {
    expect(formatSeverityTrendAgeLabel(30_000)).toBe('Just now');
    expect(formatSeverityTrendAgeLabel(5 * 60_000)).toBe('5 min ago');
    expect(formatSeverityTrendAgeLabel(3 * 60 * 60_000)).toBe('3 hr ago');
  });

  it('labels the axis from the earliest opening in the window', () => {
    expect(
      formatSeverityTrendStartLabel({
        investigations: [
          makeInvestigation('a', {
            created_at: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
          }),
        ],
        nowMs,
      })
    ).toBe('3 hr ago');
  });
});
