/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RumSessionSummary } from '../../common/session_replay';
import {
  fillSessionListSparklines,
  sessionSparklineNamedFilters,
  sparklineTimeRange,
  sparklinesFromFilterBuckets,
} from './session_list_sparklines';

const summary = (sessionId: string, startTime: string, endTime: string): RumSessionSummary => ({
  sessionId,
  startTime,
  endTime,
  eventCount: 2,
  errorCount: 0,
  actionCount: 1,
  rageClickCount: 0,
  deadClickCount: 0,
  errorGroups: [],
  activeMs: 1000,
  durationMs: 1000,
  pageCount: 1,
  entryPage: '/app/ux',
  exitPage: '/app/ux',
  pagePath: ['/app/ux'],
  activityPath: [],
  sparkline: [],
  user: { id: null, email: null, name: null },
  client: {
    browser: null,
    os: null,
    device: null,
    mobile: null,
    country: null,
    countryIso: null,
    breakpoint: null,
    connection: null,
  },
  hasReplay: true,
  replayEventCount: 1,
});

describe('sessionSparklineNamedFilters', () => {
  it('matches dest session ids on resource or attribute fields', () => {
    expect(sessionSparklineNamedFilters(['abc'])).toEqual({
      abc: {
        bool: {
          should: [
            { term: { 'attributes.session.id': 'abc' } },
            { term: { 'attributes.rum.sessionId': 'abc' } },
            { term: { 'resource.attributes.session.id': 'abc' } },
            { term: { 'resource.attributes.rum.sessionId': 'abc' } },
          ],
          minimum_should_match: 1,
        },
      },
    });
  });
});

describe('sparklineTimeRange', () => {
  it('spans the earliest start and latest end on the page', () => {
    expect(
      sparklineTimeRange([
        summary('a', '2026-08-25T10:00:00.000Z', '2026-08-25T10:01:00.000Z'),
        summary('b', '2026-08-25T10:00:30.000Z', '2026-08-25T10:05:00.000Z'),
      ])
    ).toEqual({
      gte: '2026-08-25T10:00:00.000Z',
      lte: '2026-08-25T10:05:00.000Z',
    });
  });

  it('returns undefined when the page has no timestamps', () => {
    expect(sparklineTimeRange([{ startTime: null, endTime: null }])).toBeUndefined();
  });
});

describe('sparklinesFromFilterBuckets', () => {
  it('builds 16 buckets and marks the error slot', () => {
    const start = '2026-08-25T10:00:00.000Z';
    const end = '2026-08-25T10:16:00.000Z';
    const sparklines = sparklinesFromFilterBuckets(
      {
        a: {
          sample: {
            hits: {
              hits: [
                { _source: { '@timestamp': start, name: 'documentLoad' } },
                {
                  _source: {
                    '@timestamp': '2026-08-25T10:15:59.000Z',
                    event_name: 'exception',
                  },
                },
              ],
            },
          },
        },
      },
      [summary('a', start, end)]
    );
    const bars = sparklines.get('a');
    expect(bars).toHaveLength(16);
    expect(bars?.[0]).toEqual({ count: 1, hasError: false });
    expect(bars?.[15]).toEqual({ count: 1, hasError: true });
  });

  it('skips sessions with no sampled hits so the cell stays empty', () => {
    const sparklines = sparklinesFromFilterBuckets({ a: { sample: { hits: { hits: [] } } } }, [
      summary('a', '2026-08-25T10:00:00.000Z', '2026-08-25T10:01:00.000Z'),
    ]);
    expect(sparklines.has('a')).toBe(false);
  });
});

describe('fillSessionListSparklines', () => {
  it('does not search when the page has no session ids', async () => {
    const search = jest.fn();
    const result = await fillSessionListSparklines(
      { search } as unknown as ElasticsearchClient,
      []
    );
    expect(search).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('fills an empty dest page path from fetch-span URLs', async () => {
    const start = '2026-08-25T10:00:00.000Z';
    const end = '2026-08-25T10:01:00.000Z';
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        sessions: {
          buckets: {
            a: {
              sample: {
                hits: {
                  hits: [
                    {
                      _source: {
                        '@timestamp': start,
                        name: 'POST',
                        attributes: { 'url.path.grouped': '/app/ux/kibana-pr-284540/*' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });
    const row = { ...summary('a', start, end), pagePath: [], entryPage: null, exitPage: null };
    const result = await fillSessionListSparklines({ search } as unknown as ElasticsearchClient, [
      row,
    ]);
    expect(result[0]?.pagePath).toEqual(['app/ux/kibana-pr-284540/*']);
    expect(result[0]?.entryPage).toBe('app/ux/kibana-pr-284540/*');
  });

  it('attaches sparklines from the follow-up filters agg', async () => {
    const start = '2026-08-25T10:00:00.000Z';
    const end = '2026-08-25T10:01:00.000Z';
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        sessions: {
          buckets: {
            a: {
              sample: {
                hits: {
                  hits: [{ _source: { '@timestamp': start, name: 'click' } }],
                },
              },
            },
          },
        },
      },
    });
    const result = await fillSessionListSparklines({ search } as unknown as ElasticsearchClient, [
      summary('a', start, end),
    ]);
    expect(search).toHaveBeenCalledTimes(1);
    expect(result[0]?.sparkline.some((bucket) => bucket.count > 0)).toBe(true);
  });

  it('keeps dest rows when the follow-up search fails', async () => {
    const search = jest.fn().mockRejectedValue(new Error('ccs timeout'));
    const row = summary('a', '2026-08-25T10:00:00.000Z', '2026-08-25T10:01:00.000Z');
    const result = await fillSessionListSparklines({ search } as unknown as ElasticsearchClient, [
      row,
    ]);
    expect(result).toEqual([row]);
  });
});
