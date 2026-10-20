/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  DEFAULT_LOOKBACK_HOURS,
  resolveSearchWindow,
  searchWindowShape,
  toEsqlTimestampClause,
  withSearchWindowChecks,
} from './resolve_search_window';

const schema = lazySchema(() => withSearchWindowChecks(z.object(searchWindowShape())));
const NOW = new Date('2026-10-17T12:00:00.000Z');

describe('resolveSearchWindow', () => {
  it('counts a lookback back from now when no incident bounds are given', () => {
    expect(resolveSearchWindow(schema.parse({}), NOW)).toEqual({
      start: '2026-10-14T12:00:00.000Z',
      end: '2026-10-17T12:00:00.000Z',
      anchor: 'lookback',
    });
    expect(DEFAULT_LOOKBACK_HOURS).toBe(72);
    expect(resolveSearchWindow(schema.parse({ time_window_hours: 24 }), NOW).start).toBe(
      '2026-10-16T12:00:00.000Z'
    );
  });

  it('anchors on the incident bounds and ignores the lookback when both are given', () => {
    const window = resolveSearchWindow(
      schema.parse({
        start: '2026-10-16T10:00:00.000Z',
        end: '2026-10-16T11:30:00.000Z',
        time_window_hours: 720,
      }),
      NOW
    );
    expect(window).toEqual({
      start: '2026-10-16T10:00:00.000Z',
      end: '2026-10-16T11:30:00.000Z',
      anchor: 'incident',
    });
  });

  it('widens the incident window by the margin on each side', () => {
    const window = resolveSearchWindow(
      schema.parse({
        start: '2026-10-16T10:00:00.000Z',
        end: '2026-10-16T11:30:00.000Z',
        margin_hours: 2,
      }),
      NOW
    );
    expect(window.start).toBe('2026-10-16T08:00:00.000Z');
    expect(window.end).toBe('2026-10-16T13:30:00.000Z');
  });

  it('normalizes offset timestamps to UTC instants', () => {
    const window = resolveSearchWindow(
      schema.parse({ start: '2026-10-16T12:00:00+02:00', end: '2026-10-16T13:00:00+02:00' }),
      NOW
    );
    expect(window.start).toBe('2026-10-16T10:00:00.000Z');
    expect(window.end).toBe('2026-10-16T11:00:00.000Z');
  });

  it('rejects a start without an end, and an end before its start', () => {
    expect(schema.safeParse({ start: '2026-10-16T10:00:00.000Z' }).success).toBe(false);
    expect(schema.safeParse({ end: '2026-10-16T10:00:00.000Z' }).success).toBe(false);
    expect(
      schema.safeParse({ start: '2026-10-16T11:00:00.000Z', end: '2026-10-16T10:00:00.000Z' })
        .success
    ).toBe(false);
    expect(schema.safeParse({ start: 'yesterday', end: 'today' }).success).toBe(false);
  });

  it('accepts equal incident bounds and widens the instant by the margin', () => {
    const instant = '2026-10-16T10:00:00.000Z';
    expect(schema.safeParse({ start: instant, end: instant, margin_hours: 2 }).success).toBe(true);
    expect(
      resolveSearchWindow(schema.parse({ start: instant, end: instant, margin_hours: 2 }), NOW)
    ).toEqual({
      start: '2026-10-16T08:00:00.000Z',
      end: '2026-10-16T12:00:00.000Z',
      anchor: 'incident',
    });
  });

  it('bounds the margin and the lookback', () => {
    expect(schema.safeParse({ margin_hours: 73 }).success).toBe(false);
    expect(schema.safeParse({ time_window_hours: 721 }).success).toBe(false);
    expect(schema.safeParse({ time_window_hours: 0 }).success).toBe(false);
  });

  it('renders an inclusive ES|QL range on both ends', () => {
    expect(
      toEsqlTimestampClause({
        start: '2026-10-16T08:00:00.000Z',
        end: '2026-10-16T13:30:00.000Z',
        anchor: 'incident',
      })
    ).toBe(
      '@timestamp >= TO_DATETIME("2026-10-16T08:00:00.000Z") AND @timestamp <= TO_DATETIME("2026-10-16T13:30:00.000Z")'
    );
  });
});
