/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_LIVE_POLL_MS,
  clampReplayOffsetMs,
  collectReplayEventPages,
  filterLiveSessions,
  formatReplayClock,
  hasLiveReplaySeed,
  isAtLiveEdge,
  isPlayableRrwebEvent,
  livePlayFromMs,
  parseFollowSessionId,
  parseLivePollMs,
} from './session_replay_live';

describe('session replay live helpers', () => {
  it('accepts rrweb event types 0–7 and rejects the Elastic 99 marker', () => {
    expect(isPlayableRrwebEvent({ type: 2 })).toBe(true);
    expect(isPlayableRrwebEvent({ type: 4 })).toBe(true);
    expect(isPlayableRrwebEvent({ type: 99 })).toBe(false);
    expect(isPlayableRrwebEvent({})).toBe(false);
  });

  it('requires Meta and FullSnapshot before live follow can start', () => {
    expect(hasLiveReplaySeed([{ type: 4 }, { type: 3 }])).toBe(false);
    expect(hasLiveReplaySeed([{ type: 2 }, { type: 3 }])).toBe(false);
    expect(hasLiveReplaySeed([{ type: 4 }, { type: 2 }])).toBe(true);
  });

  it('falls back to the default poll interval for unknown values', () => {
    expect(parseLivePollMs(2000)).toBe(2000);
    expect(parseLivePollMs(7)).toBe(DEFAULT_LIVE_POLL_MS);
  });

  it('treats the playhead as live when it is at or past the buffered end', () => {
    expect(isAtLiveEdge(0, 0)).toBe(true);
    expect(isAtLiveEdge(9920, 10000)).toBe(true);
    expect(isAtLiveEdge(5000, 10000)).toBe(false);
  });

  it('clamps seek offsets to the buffered range', () => {
    expect(clampReplayOffsetMs(-100, 8000)).toBe(0);
    expect(clampReplayOffsetMs(4000, 8000)).toBe(4000);
    expect(clampReplayOffsetMs(9000, 8000)).toBe(8000);
  });

  it('starts live catch-up at the first new event so poll gaps are not replayed as idle', () => {
    expect(livePlayFromMs(1_000, 6_000)).toBe(5_000);
    expect(livePlayFromMs(1_000, 500)).toBe(0);
  });

  it('formats replay clocks without a leading hour until needed', () => {
    expect(formatReplayClock(0)).toBe('0:00');
    expect(formatReplayClock(65_000)).toBe('1:05');
    expect(formatReplayClock(3_661_000)).toBe('1:01:01');
  });

  it('filters live sessions by session id or service name', () => {
    const sessions = [
      { sessionId: 'aaa-111', serviceName: 'shop' },
      { sessionId: 'bbb-222', serviceName: 'checkout' },
    ];
    expect(filterLiveSessions(sessions, '')).toHaveLength(2);
    expect(filterLiveSessions(sessions, 'BBB').map((session) => session.sessionId)).toEqual([
      'bbb-222',
    ]);
    expect(filterLiveSessions(sessions, 'shop').map((session) => session.sessionId)).toEqual([
      'aaa-111',
    ]);
    expect(filterLiveSessions(sessions, 'missing')).toEqual([]);
  });

  it('pages replay events until a short page', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({
        events: [{ type: 4 }],
        hitCount: 500,
        pageFull: true,
        lastCompleteEvent: 10,
      })
      .mockResolvedValueOnce({
        events: [{ type: 2 }],
        hitCount: 12,
        pageFull: false,
        lastCompleteEvent: 22,
      });

    const collected = await collectReplayEventPages(fetchPage);

    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 10);
    expect(collected).toEqual({
      events: [{ type: 4 }, { type: 2 }],
      truncated: false,
      lastCompleteEvent: 22,
    });
  });

  it('stops and flags truncation when the cursor does not advance', async () => {
    const collected = await collectReplayEventPages(async () => ({
      events: [{ type: 3 }],
      hitCount: 500,
      pageFull: true,
      lastCompleteEvent: null,
    }));

    expect(collected.truncated).toBe(true);
    expect(collected.events).toEqual([{ type: 3 }]);
  });

  it('stops paging early once shouldStop is true', async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      events: [{ type: 4 }, { type: 2 }],
      hitCount: 500,
      pageFull: true,
      lastCompleteEvent: 2,
    });

    const collected = await collectReplayEventPages(fetchPage, {
      shouldStop: (events) => hasLiveReplaySeed(events as Array<{ type?: number }>),
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(collected.truncated).toBe(false);
  });

  it('accepts a pasted session id for follow-by-id', () => {
    expect(parseFollowSessionId('f70f3dbe-78d2-40ed-ac0c-a885034cb01a')).toBe(
      'f70f3dbe-78d2-40ed-ac0c-a885034cb01a'
    );
    expect(parseFollowSessionId('  abcd1234  ')).toBe('abcd1234');
    expect(parseFollowSessionId('shop')).toBeNull();
    expect(parseFollowSessionId('ab')).toBeNull();
  });
});
