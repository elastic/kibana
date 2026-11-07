/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  buildInvestigationsHistogramSeries,
  severityKey,
} from './investigations_histogram_series';

const investigation = (
  id: string,
  {
    updatedAt,
    severity,
    state = 'open',
  }: {
    updatedAt: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    state?: 'open' | 'closed' | 'archived';
  }
): InvestigationSummary => ({
  id,
  title: id,
  title_pending: false,
  created_at: updatedAt,
  updated_at: updatedAt,
  agent_id: 'nightshift.investigation',
  metadata: {
    status: state === 'closed' || state === 'archived' ? 'closed' : 'open',
    severity,
  },
  in_progress: false,
  subjects: [],
});

describe('buildInvestigationsHistogramSeries', () => {
  const fromMs = Date.parse('2026-11-06T23:00:00.000Z');
  const toMs = Date.parse('2026-11-06T23:30:00.000Z');

  it('buckets by last update with no breakdown', () => {
    const { series } = buildInvestigationsHistogramSeries({
      investigations: [
        investigation('a', { updatedAt: '2026-11-06T23:05:00.000Z', severity: 'high' }),
        investigation('b', { updatedAt: '2026-11-06T23:05:30.000Z', severity: 'low' }),
        investigation('c', { updatedAt: '2026-11-06T22:00:00.000Z', severity: 'critical' }),
      ],
      fromMs,
      toMs,
      breakdown: 'none',
      severityOf: severityKey,
      stateOf: () => 'open',
    });

    expect(series).toHaveLength(1);
    expect(series[0].id).toBe('all');
    expect(series[0].data.reduce((sum, point) => sum + point.y, 0)).toBe(2);
  });

  it('stacks by severity when broken down', () => {
    const { series } = buildInvestigationsHistogramSeries({
      investigations: [
        investigation('a', { updatedAt: '2026-11-06T23:05:00.000Z', severity: 'high' }),
        investigation('b', { updatedAt: '2026-11-06T23:05:30.000Z', severity: 'high' }),
        investigation('c', { updatedAt: '2026-11-06T23:20:00.000Z' }),
      ],
      fromMs,
      toMs,
      breakdown: 'severity',
      severityOf: severityKey,
      stateOf: () => 'open',
    });

    const high = series.find((item) => item.id === 'high');
    const none = series.find((item) => item.id === 'none');
    expect(high?.data.reduce((sum, point) => sum + point.y, 0)).toBe(2);
    expect(none?.data.reduce((sum, point) => sum + point.y, 0)).toBe(1);
  });
});
