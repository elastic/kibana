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

/** The top query's rows, then the totals, the series and the first seen ones, as the route asks. */
const setup = ({
  top,
  totals,
  series = [],
  firstSeen = [],
}: {
  top: Row[];
  totals: Row[];
  series?: Row[];
  firstSeen?: Row[];
}) => {
  const { client, esClient } = createTracedEsClientMock();
  client.esql.query
    .mockResolvedValueOnce(esqlResponse(top))
    .mockResolvedValueOnce(esqlResponse(totals))
    .mockResolvedValueOnce(esqlResponse(series))
    .mockResolvedValueOnce(esqlResponse(firstSeen));
  const run = (release?: string) =>
    getMobileReleases({
      esClient,
      filters: { serviceName: 'shop-mobile', release },
      start: START,
      end: END,
      environment: 'production',
    });
  return { client, run };
};

const total = (release_group: string, sessions: number, exceptions = 0, users = 1) => ({
  release_group,
  sessions,
  users,
  exceptions,
});

describe('getMobileReleases', () => {
  it('has nothing without releases, and asks no more queries', async () => {
    const { client, run } = setup({ top: [], totals: [] });

    const response = await run();

    expect(response).toEqual({
      histogram: expect.objectContaining({ start: START, end: END }),
      releases: [],
      series: [],
      markers: [],
    });
    expect(client.esql.query).toHaveBeenCalledTimes(1);
  });

  it('lists the top 5 of 7 releases by sessions, and the rest as "Other" last', async () => {
    const top = ['1', '2', '3', '4', '5'].map((release, index) => ({
      release,
      sessions: 500 - index,
    }));
    const { client, run } = setup({
      top,
      // Rows come in any order; "Other" has more sessions than most and still comes last.
      totals: [total('', 900), total('3', 300), total('1', 500), total('2', 400)],
    });

    const { releases } = await run();

    expect(releases.map(({ release, isOther }) => [release, isOther])).toEqual([
      ['1', false],
      ['2', false],
      ['3', false],
      ['', true],
    ]);
    const [topRequest, totalsRequest] = client.esql.query.mock.calls.map(([request]) => request);
    expect(topRequest.query).toContain('LIMIT 5');
    expect(totalsRequest.query).toContain('IN ("1", "2", "3", "4", "5")');
  });

  it('has no "Other" when every release is in the top', async () => {
    const { run } = setup({
      top: [
        { release: '1', sessions: 3 },
        { release: '2', sessions: 2 },
        { release: '3', sessions: 1 },
      ],
      totals: [total('2', 200), total('1', 300), total('3', 100)],
    });

    const { releases } = await run();

    expect(releases.map(({ release }) => release)).toEqual(['1', '2', '3']);
    expect(releases.some(({ isOther }) => isOther)).toBe(false);
  });

  it('shows an error rate from 100 sessions: 99 has none', async () => {
    const { run } = setup({
      top: [
        { release: '1', sessions: 100 },
        { release: '2', sessions: 99 },
      ],
      totals: [total('1', 100, 25, 10), total('2', 99, 25, 9)],
    });

    const { releases } = await run();

    expect(releases).toEqual([
      { release: '1', isOther: false, sessions: 100, users: 10, errorRate: 0.25 },
      { release: '2', isOther: false, sessions: 99, users: 9, errorRate: null },
    ]);
  });

  it('is one group for the release filter, with its own queries', async () => {
    const { client, run } = setup({
      top: [{ release: '2.0.0', sessions: 300 }],
      totals: [total('2.0.0', 300, 3)],
    });

    const { releases } = await run('2.0.0');

    expect(releases.map(({ release }) => release)).toEqual(['2.0.0']);
    expect(client.esql.query.mock.calls[0][0].params).toEqual(
      expect.arrayContaining([{ release: '2.0.0' }])
    );
  });

  it('gives each release its points by bucket, with an error rate where it has sessions', async () => {
    const { run } = setup({
      top: [{ release: '1', sessions: 300 }],
      totals: [total('1', 300)],
      series: [
        {
          release_group: '1',
          bucket: new Date(START + HOUR).toISOString(),
          sessions: 4,
          exceptions: 2,
        },
        { release_group: '1', bucket: new Date(START).toISOString(), sessions: 5, exceptions: 0 },
      ],
    });

    const { series } = await run();

    expect(series).toEqual([
      {
        release: '1',
        isOther: false,
        points: [
          { timestamp: START, sessions: 5, errorRate: 0 },
          { timestamp: START + HOUR, sessions: 4, errorRate: 0.5 },
        ],
      },
    ]);
  });

  it('marks the releases first seen in the range, not those from before, looking 30 days back', async () => {
    const { client, run } = setup({
      top: [
        { release: '1', sessions: 300 },
        { release: '2', sessions: 200 },
      ],
      totals: [total('1', 300), total('2', 200)],
      firstSeen: [
        { release: '1', first_seen: new Date(START - 2 * DAY).toISOString() },
        { release: '2', first_seen: new Date(START + HOUR).toISOString() },
      ],
    });

    const { markers } = await run();

    expect(markers).toEqual([{ release: '2', firstSeen: START + HOUR }]);
    const [, , , firstSeenRequest] = client.esql.query.mock.calls.map(([request]) => request);
    expect(firstSeenRequest.filter).toEqual({
      bool: {
        filter: [
          { range: { '@timestamp': { gte: START - 30 * DAY, lt: END, format: 'epoch_millis' } } },
          expect.anything(),
        ],
      },
    });
  });
});
