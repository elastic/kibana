/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Watch, WatchRecentRun } from '@kbn/pnd-common';
import { buildActivityFeed } from './activity_feed_table';

const makeRun = (overrides: Partial<WatchRecentRun> = {}): WatchRecentRun => ({
  executionId: 'exec-1',
  startedAt: '2026-07-20T00:00:00.000Z',
  status: 'completed',
  steps: [],
  summary: 'Run summary',
  ...overrides,
});

const makeWatch = (overrides: Partial<Watch> = {}): Watch =>
  ({
    id: 'watch-a',
    name: 'Watch A',
    color: '#000',
    recentRuns: [],
    ...overrides,
  } as unknown as Watch);

describe('buildActivityFeed', () => {
  it('flattens runs from every watch into one feed', () => {
    const watches = [
      makeWatch({ id: 'watch-a', name: 'Watch A', recentRuns: [makeRun({ executionId: 'a1' })] }),
      makeWatch({ id: 'watch-b', name: 'Watch B', recentRuns: [makeRun({ executionId: 'b1' })] }),
    ];

    const feed = buildActivityFeed(watches);

    expect(feed).toHaveLength(2);
    expect(feed.map((r) => r.executionId).sort()).toEqual(['a1', 'b1']);
  });

  it('tags each row with its source watch id/name/color', () => {
    const watches = [
      makeWatch({
        id: 'watch-a',
        name: 'Watch A',
        color: '#123456',
        recentRuns: [makeRun({ executionId: 'a1' })],
      }),
    ];

    const feed = buildActivityFeed(watches);

    expect(feed[0]).toMatchObject({
      watchId: 'watch-a',
      watchName: 'Watch A',
      watchColor: '#123456',
    });
  });

  it('sorts by startedAt descending (newest first) across watches', () => {
    const watches = [
      makeWatch({
        id: 'watch-a',
        recentRuns: [makeRun({ executionId: 'old', startedAt: '2026-07-01T00:00:00.000Z' })],
      }),
      makeWatch({
        id: 'watch-b',
        recentRuns: [makeRun({ executionId: 'new', startedAt: '2026-07-25T00:00:00.000Z' })],
      }),
    ];

    const feed = buildActivityFeed(watches);

    expect(feed.map((r) => r.executionId)).toEqual(['new', 'old']);
  });

  it('returns an empty array when no watch has any recent runs', () => {
    const watches = [makeWatch({ recentRuns: [] })];

    expect(buildActivityFeed(watches)).toEqual([]);
  });

  it('handles an empty watch list', () => {
    expect(buildActivityFeed([])).toEqual([]);
  });
});
