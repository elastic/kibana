/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSessionDetail, mergeSessionHits, sessionSpanFromSearch } from './session_detail';

const start = '2026-08-24T18:35:26.602Z';
const sampledEnd = '2026-08-24T18:40:25.482Z';
const sessionEnd = '2026-08-25T07:46:28.793Z';

const hit = (id: string, ts: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  _source: {
    '@timestamp': ts,
    attributes: { 'page.url.path': '/app/ux/kibana-pr-284540/session-replay/abc' },
    ...extra,
  },
});

describe('sessionSpanFromSearch', () => {
  it('uses aggregations so a truncated hit window does not shrink duration', () => {
    const span = sessionSpanFromSearch(
      {
        min_ts: { value: Date.parse(start), value_as_string: start },
        max_ts: { value: Date.parse(sessionEnd), value_as_string: sessionEnd },
        error_count: { doc_count: 2 },
        click_count: { doc_count: 0 },
      },
      [hit('1', start, { name: 'documentLoad' }), hit('2', sampledEnd, { name: 'responseEnd' })],
      { value: 4038, relation: 'eq' }
    );

    expect(span.eventCount).toBe(4038);
    expect(span.errorCount).toBe(2);
    expect(span.actionCount).toBe(0);
    expect(span.startMs).toBe(Date.parse(start));
    expect(span.endMs).toBe(Date.parse(sessionEnd));
    expect(span.endMs - span.startMs).toBe(47462191);
  });
});

describe('mergeSessionHits', () => {
  it('appends later error docs that were outside the sampled window', () => {
    const sampled = [hit('1', start, { name: 'documentLoad' })];
    const extra = [hit('err', '2026-08-25T03:28:55.468Z', { event_name: 'error' })];
    expect(mergeSessionHits(sampled, extra).map((item) => item._id)).toEqual(['1', 'err']);
  });

  it('does not duplicate hits already in the sample', () => {
    const sampled = [hit('err', start, { event_name: 'error' })];
    expect(mergeSessionHits(sampled, sampled)).toHaveLength(1);
  });
});

describe('buildSessionDetail', () => {
  it('shows wall-clock duration from the full span, not the sampled hits', () => {
    const detail = buildSessionDetail({
      sessionId: '1ef014fc-a732-4cbe-8db9-e4915db937eb',
      hits: [
        hit('1', start, { name: 'documentLoad' }),
        hit('2', sampledEnd, { event_name: 'responseEnd' }),
        hit('err', '2026-08-25T03:28:55.468Z', { event_name: 'error' }),
      ],
      span: {
        startMs: Date.parse(start),
        endMs: Date.parse(sessionEnd),
        eventCount: 4038,
        errorCount: 2,
        actionCount: 0,
      },
      replayEventCount: 463,
    });

    expect(detail.durationMs).toBe(47462191);
    expect(detail.eventCount).toBe(4038);
    expect(detail.errorCount).toBe(2);
    expect(detail.actionCount).toBe(0);
    expect(detail.hasReplay).toBe(true);
    expect(detail.pageCount).toBe(1);
    expect(detail.pageVisits[0]?.durationMs).toBe(47462191);
    expect(detail.pageVisits[0]?.errorCount).toBe(1);
  });
});
