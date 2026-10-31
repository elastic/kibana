/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bounceRate,
  isBouncedSession,
  isHeartbeatOnlySession,
  sessionBounceCounts,
  sessionUserFromKey,
} from './session_replay';

describe('sessionUserFromKey', () => {
  it('treats an email key as email so the table can show it', () => {
    expect(sessionUserFromKey('dave.denscombe@elastic.co')).toEqual({
      id: 'dave.denscombe@elastic.co',
      email: 'dave.denscombe@elastic.co',
      name: null,
    });
  });

  it('treats a non-email key as id and name', () => {
    expect(sessionUserFromKey('ada')).toEqual({
      id: 'ada',
      email: null,
      name: 'ada',
    });
  });

  it('returns an empty user when the session rollup has no key', () => {
    expect(sessionUserFromKey(null)).toEqual({ id: null, email: null, name: null });
  });
});

describe('isHeartbeatOnlySession', () => {
  const heartbeat = {
    pageCount: 0,
    actionCount: 0,
    errorCount: 0,
    hasReplay: false,
  };

  it('hides rows with no page, click, error, or replay', () => {
    expect(isHeartbeatOnlySession(heartbeat)).toBe(true);
  });

  it('keeps replay-only rows', () => {
    expect(isHeartbeatOnlySession({ ...heartbeat, hasReplay: true })).toBe(false);
  });

  it('keeps rows with a click or error', () => {
    expect(isHeartbeatOnlySession({ ...heartbeat, actionCount: 1 })).toBe(false);
    expect(isHeartbeatOnlySession({ ...heartbeat, errorCount: 2 })).toBe(false);
  });
});

describe('bounceRate', () => {
  it('is bounced over viewed sessions, not including zero-page rows', () => {
    expect(isBouncedSession(1)).toBe(true);
    expect(isBouncedSession(0)).toBe(false);
    expect(isBouncedSession(2)).toBe(false);
    expect(bounceRate(3, 10)).toBe(0.3);
    expect(bounceRate(0, 0)).toBeNull();
    expect(
      sessionBounceCounts([{ pageCount: 0 }, { pageCount: 1 }, { pageCount: 1 }, { pageCount: 3 }])
    ).toEqual({ bounced: 2, viewed: 3 });
  });
});
