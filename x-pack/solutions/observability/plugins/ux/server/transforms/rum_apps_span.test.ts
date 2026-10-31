/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_SESSIONS_INDEX } from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import { queryRumAppsSpan } from './rum_apps_span';

const DAY = 24 * 60 * 60 * 1000;
const rangeTo = '2026-08-20T00:00:00.000Z';
const rangeFrom = '2026-08-19T00:00:00.000Z';
const rangeFromMs = Date.parse(rangeFrom);
const rangeToMs = Date.parse(rangeTo);

describe('queryRumAppsSpan', () => {
  it('histograms session-index start_time across the lookback window', async () => {
    const older = rangeFromMs - 3 * DAY;
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        sessionTraffic: {
          buckets: [{ key: older, doc_count: 12 }],
        },
      },
    });
    const result = await queryRumAppsSpan({
      client: { search } as never,
      rangeFrom,
      rangeTo,
      useIndex: true,
      watermark: rangeTo,
      lookbackDays: 90,
    });
    expect(search.mock.calls[0][0].index).toBe(RUM_SESSIONS_INDEX);
    expect(search.mock.calls[0][0].aggs.sessionTraffic.auto_date_histogram.field).toBe(
      'start_time'
    );
    expect(result.hasData).toBe(true);
    expect(result.points).toEqual([{ timestamp: older, sessions: 12 }]);
    expect(result.domainFrom).toBe(older);
    expect(result.domainTo).toBe(rangeToMs);
  });

  it('falls back to raw OTel traffic when the session index is off', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {} });
    const result = await queryRumAppsSpan({
      client: { search } as never,
      rangeFrom,
      rangeTo,
      useIndex: false,
    });
    expect(search.mock.calls[0][0].index).toBe(RUM_SESSION_SOURCE_INDEX);
    expect(search.mock.calls[0][0].aggs.sessionTraffic.aggs.sessions).toBeDefined();
    expect(result.hasData).toBe(false);
    expect(result.points).toEqual([]);
  });

  it('does not treat in-range buckets as outside data', async () => {
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        sessionTraffic: {
          buckets: [{ key: rangeFromMs + 60 * 60 * 1000, doc_count: 4 }],
        },
      },
    });
    const result = await queryRumAppsSpan({
      client: { search } as never,
      rangeFrom,
      rangeTo,
      useIndex: true,
      watermark: rangeTo,
    });
    expect(result.hasData).toBe(false);
  });
});
