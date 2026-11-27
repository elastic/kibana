/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTracedEsClientMock,
  esqlResponse,
} from '../../lib/create_digital_experience_traced_es_client.test_helpers';
import { getMobileReleases } from './get_mobile_releases';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const START = 40 * DAY;
const END = 41 * DAY;

type Row = Record<string, unknown>;

type QueryKind = 'stats' | 'other' | 'series' | 'seen';

/** Which of the route's queries a request is, by what only it has. */
const kindOf = (query: string): QueryKind => {
  if (query.includes('TBUCKET(')) {
    return 'series';
  }
  if (query.includes('WHERE NOT (')) {
    return 'other';
  }
  if (query.includes('STATS BY release')) {
    return 'seen';
  }
  return 'stats';
};

/** Answers each query with its rows, whatever order the parallel ones run in, and the buckets. */
const setup = ({
  buckets = [],
  ...rows
}: Partial<Record<QueryKind, Row[]>> & { buckets?: number[] }) => {
  const { client, esClient } = createTracedEsClientMock();
  client.esql.query.mockImplementation(
    async (request) => esqlResponse(rows[kindOf(String(request.query))] ?? []) as never
  );
  client.search.mockResolvedValue({
    aggregations: { buckets: { buckets: buckets.map((key) => ({ key, doc_count: 0 })) } },
  } as never);
  const run = (release?: string) =>
    getMobileReleases({
      esClient,
      filters: { serviceName: 'shop-mobile', release },
      start: START,
      end: END,
      environment: 'production',
      timeZone: 'America/New_York',
    });
  const requests = (kind: QueryKind) =>
    client.esql.query.mock.calls
      .map(([request]) => request)
      .filter((request) => kindOf(String(request.query)) === kind);
  return { client, run, requests };
};

/** A row of the stats query: a release, first seen in the range unless set. */
const stats = (
  release: string,
  sessions: number,
  { exceptions = 0, users = 1, firstSeen = START + HOUR } = {}
) => ({
  release,
  sessions,
  users,
  exceptions,
  first_seen: new Date(firstSeen).toISOString(),
});

describe('getMobileReleases', () => {
  it('has nothing without releases, and asks no more queries', async () => {
    const { client, run } = setup({});

    const response = await run();

    expect(response).toEqual({
      histogram: expect.objectContaining({ start: START, end: END }),
      releases: [],
      series: [],
      markers: [],
    });
    expect(client.esql.query).toHaveBeenCalledTimes(1);
  });

  it('lists the top 5 of 7 releases by sessions, and the rest as "Other" last, from its own query', async () => {
    const { run, requests } = setup({
      // One more than the top, so some are left for "Other"
      stats: ['1', '2', '3', '4', '5', '6'].map((release, index) =>
        stats(release, 500 - index * 10)
      ),
      other: [{ sessions: 900, users: 40, exceptions: 0 }],
    });

    const { releases } = await run();

    expect(releases.map(({ release, isOther }) => [release, isOther])).toEqual([
      ['1', false],
      ['2', false],
      ['3', false],
      ['4', false],
      ['5', false],
      ['', true],
    ]);
    expect(releases[5]).toEqual(expect.objectContaining({ sessions: 900, users: 40 }));
    const [statsRequest] = requests('stats');
    const [otherRequest] = requests('other');
    expect(statsRequest.query).toContain('LIMIT 6');
    expect(statsRequest.query).toContain('SORT sessions DESC, release DESC');
    expect(otherRequest.query).toContain(
      'WHERE NOT (`service.version` IN ("1", "2", "3", "4", "5"))'
    );
  });

  it('has no "Other", nor its query, when every release is in the top', async () => {
    const { run, requests } = setup({
      stats: [stats('1', 300), stats('2', 200), stats('3', 100)],
    });

    const { releases } = await run();

    expect(releases.map(({ release }) => release)).toEqual(['1', '2', '3']);
    expect(requests('other')).toHaveLength(0);
  });

  it('keeps releases with equal sessions in the same order, the highest first', async () => {
    const { run } = setup({
      stats: [stats('1.0.0', 100), stats('2.0.0', 100), stats('1.5.0', 100)],
    });

    const { releases } = await run();

    expect(releases.map(({ release }) => release)).toEqual(['2.0.0', '1.5.0', '1.0.0']);
  });

  it('shows an error rate from 100 sessions: 99 has none', async () => {
    const { run } = setup({
      stats: [
        stats('1', 100, { exceptions: 25, users: 10 }),
        stats('2', 99, { exceptions: 25, users: 9 }),
      ],
    });

    const { releases } = await run();

    expect(releases).toEqual([
      { release: '1', isOther: false, sessions: 100, users: 10, errorRate: 0.25 },
      { release: '2', isOther: false, sessions: 99, users: 9, errorRate: null },
    ]);
  });

  it('runs every query at once for the release filter, its only group', async () => {
    const { client, run, requests } = setup({ stats: [stats('2.0.0', 300, { exceptions: 3 })] });

    const { releases } = await run('2.0.0');

    expect(releases.map(({ release }) => release)).toEqual(['2.0.0']);
    // Stats, series and seen before, without "Other"
    expect(client.esql.query).toHaveBeenCalledTimes(3);
    expect(requests('stats')[0].query).toContain('LIMIT 1');
    expect(requests('stats')[0].params).toEqual(expect.arrayContaining([{ release: '2.0.0' }]));
    expect(requests('series')[0].query).toContain('IN ("2.0.0")');
  });

  it('gives each release its points by bucket, with an error rate where it has sessions', async () => {
    const { run } = setup({
      stats: [stats('1', 300)],
      series: [
        {
          release_group: '1',
          bucket: new Date(START + HOUR).toISOString(),
          sessions: 40,
          exceptions: 20,
        },
        { release_group: '1', bucket: new Date(START).toISOString(), sessions: 50, exceptions: 0 },
      ],
    });

    const { series } = await run();

    expect(series.map(({ release, isOther }) => ({ release, isOther }))).toEqual([
      { release: '1', isOther: false },
    ]);
    expect(series[0].points).toEqual(
      expect.arrayContaining([
        { timestamp: START, sessions: 50, errorRate: 0 },
        { timestamp: START + HOUR, sessions: 40, errorRate: 0.5 },
      ])
    );
  });

  it('gives every release every bucket of the range, an empty one with no sessions nor rate', async () => {
    const { run } = setup({
      buckets: [START, START + HOUR, START + 2 * HOUR],
      stats: [stats('1', 300), stats('2', 200)],
      // Release 2 has no documents in the first bucket, release 1 none in the second
      series: [
        { release_group: '1', bucket: new Date(START).toISOString(), sessions: 50, exceptions: 5 },
        {
          release_group: '2',
          bucket: new Date(START + HOUR).toISOString(),
          sessions: 20,
          exceptions: 0,
        },
      ],
    });

    const { series } = await run();

    const empty = (timestamp: number) => ({ timestamp, sessions: 0, errorRate: null });
    expect(series.map(({ points }) => points)).toEqual([
      [
        { timestamp: START, sessions: 50, errorRate: 0.1 },
        empty(START + HOUR),
        empty(START + 2 * HOUR),
      ],
      [
        empty(START),
        { timestamp: START + HOUR, sessions: 20, errorRate: 0 },
        empty(START + 2 * HOUR),
      ],
    ]);
  });

  it('asks Elasticsearch for the buckets of the range in the time zone, the empty ones too', async () => {
    const { client, run } = setup({ stats: [stats('1', 300)] });

    await run();

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 0,
        query: { match_none: {} },
        aggs: {
          buckets: {
            date_histogram: expect.objectContaining({
              time_zone: 'America/New_York',
              min_doc_count: 0,
              // The range is half-open; `extended_bounds` includes its max
              extended_bounds: { min: START, max: END - 1 },
            }),
          },
        },
      }),
      expect.anything()
    );
  });

  it("buckets the series in the user's time zone, sorted and capped, and only the series", async () => {
    const { run, requests } = setup({ stats: [stats('1', 300)] });

    await run();

    const [seriesRequest] = requests('series');
    expect(seriesRequest.time_zone).toBe('America/New_York');
    // Above ES|QL's default of 1,000 rows, which a long range of daily buckets passes
    expect(seriesRequest.query).toContain('SORT bucket ASC | LIMIT 10000');
    expect(seriesRequest.query).not.toContain('users');
    [...requests('stats'), ...requests('seen')].forEach((request) =>
      expect(request).not.toHaveProperty('time_zone')
    );
  });

  it('leaves the error rate of a bucket below 10 sessions out: 9 has none', async () => {
    const { run } = setup({
      stats: [stats('1', 300)],
      series: [
        { release_group: '1', bucket: new Date(START).toISOString(), sessions: 10, exceptions: 1 },
        {
          release_group: '1',
          bucket: new Date(START + HOUR).toISOString(),
          sessions: 9,
          exceptions: 3,
        },
      ],
    });

    const { series } = await run();

    expect(series[0].points).toEqual(
      expect.arrayContaining([
        { timestamp: START, sessions: 10, errorRate: 0.1 },
        { timestamp: START + HOUR, sessions: 9, errorRate: null },
      ])
    );
  });

  it('marks where releases first appear in the range, unless seen in the 30 days before it', async () => {
    const { run, requests } = setup({
      stats: [
        stats('1', 300, { firstSeen: START }),
        stats('2', 200, { firstSeen: START + 2 * HOUR }),
        stats('3', 100, { firstSeen: START + HOUR }),
      ],
      seen: [{ release: '1' }],
    });

    const { markers } = await run();

    expect(markers).toEqual([
      { release: '3', firstSeen: START + HOUR },
      { release: '2', firstSeen: START + 2 * HOUR },
    ]);
    // Only before the range, which the stats query already covers
    expect(requests('seen')[0].filter).toEqual({
      bool: {
        filter: [
          { range: { '@timestamp': { gte: START - 30 * DAY, lt: START, format: 'epoch_millis' } } },
          expect.anything(),
        ],
      },
    });
  });
});
