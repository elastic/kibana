/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dropTrailingZeros,
  prepareTimelineEntries,
} from './prepare_timeline_entries';
import type { RiskScoreHistoryEntry } from '../../../../common/api/entity_analytics';

const entry = (
  timestamp: string,
  score: number,
  level: RiskScoreHistoryEntry['calculated_level'] = 'Low'
): RiskScoreHistoryEntry => ({
  '@timestamp': timestamp,
  calculated_score_norm: score,
  calculated_level: level,
});

describe('prepareTimelineEntries', () => {
  it('drops trailing zero reset points', () => {
    const result = dropTrailingZeros([
      entry('2026-07-01T00:00:00.000Z', 69, 'Moderate'),
      entry('2026-07-06T00:00:00.000Z', 0, 'Unknown'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].calculated_score_norm).toBe(69);
  });

  it('densifies weekly observations into daily chart points ending on the latest real score', () => {
    const { chartEntries, selectableEntries } = prepareTimelineEntries(
      [
        entry('2026-06-22T12:00:00.000Z', 71, 'High'),
        entry('2026-06-29T12:00:00.000Z', 69, 'Moderate'),
        entry('2026-07-06T12:00:00.000Z', 0, 'Unknown'),
      ],
      '2026-06-22T00:00:00.000Z',
      '2026-07-06T23:59:59.999Z'
    );

    expect(selectableEntries).toHaveLength(2);
    expect(selectableEntries[selectableEntries.length - 1].calculated_score_norm).toBe(69);

    expect(chartEntries.length).toBeGreaterThan(selectableEntries.length);
    expect(chartEntries[chartEntries.length - 1].calculated_score_norm).toBe(69);
    // consecutive day spacing
    const dayMs = 24 * 60 * 60 * 1000;
    for (let i = 1; i < chartEntries.length; i++) {
      const prev = new Date(chartEntries[i - 1]['@timestamp']).getTime();
      const curr = new Date(chartEntries[i]['@timestamp']).getTime();
      expect(curr - prev).toBe(dayMs);
    }
  });

  it('overlays the entity-store current score on the rightmost chart point', () => {
    const { chartEntries } = prepareTimelineEntries(
      [
        entry('2026-06-22T12:00:00.000Z', 71, 'High'),
        entry('2026-06-29T12:00:00.000Z', 69, 'Moderate'),
      ],
      '2026-06-22T00:00:00.000Z',
      '2026-06-29T23:59:59.999Z',
      { calculated_score_norm: 72.45, calculated_level: 'High' }
    );

    expect(chartEntries[chartEntries.length - 1].calculated_score_norm).toBe(72.45);
    expect(chartEntries[chartEntries.length - 1].calculated_level).toBe('High');
  });

  it('densifies into hourly points for a single-day range', () => {
    const dayStart = new Date(2026, 0, 10);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const { chartEntries, interval } = prepareTimelineEntries(
      [
        entry(new Date(2026, 0, 10, 8).toISOString(), 40, 'Moderate'),
        entry(new Date(2026, 0, 10, 20).toISOString(), 60, 'Moderate'),
      ],
      dayStart.toISOString(),
      dayEnd.toISOString()
    );

    expect(interval).toBe('1h');
    // Past local days always get a full 24-hour view (00:00 … 23:00).
    expect(chartEntries).toHaveLength(24);
    const hourMs = 60 * 60 * 1000;
    for (let i = 1; i < chartEntries.length; i++) {
      const prev = new Date(chartEntries[i - 1]['@timestamp']).getTime();
      const curr = new Date(chartEntries[i]['@timestamp']).getTime();
      expect(curr - prev).toBe(hourMs);
    }
    expect(new Date(chartEntries[0]['@timestamp']).getHours()).toBe(0);
    expect(new Date(chartEntries[chartEntries.length - 1]['@timestamp']).getHours()).toBe(23);
    expect(chartEntries[chartEntries.length - 1].calculated_score_norm).toBe(60);
  });

  it('invents morning hours when API data only starts in the afternoon', () => {
    const dayStart = new Date(2026, 0, 10);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const { chartEntries } = prepareTimelineEntries(
      [entry(new Date(2026, 0, 10, 14).toISOString(), 55, 'Moderate')],
      dayStart.toISOString(),
      dayEnd.toISOString()
    );

    expect(chartEntries).toHaveLength(24);
    expect(new Date(chartEntries[0]['@timestamp']).getHours()).toBe(0);
    expect(chartEntries[0].calculated_score_norm).toBeGreaterThan(0);
  });
});
