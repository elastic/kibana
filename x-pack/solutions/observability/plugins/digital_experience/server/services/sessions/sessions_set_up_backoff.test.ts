/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SESSIONS_SET_UP_BACKOFF_MS, createSessionsSetUpBackoff } from './sessions_set_up_backoff';

const NOW = Date.parse('2026-11-23T12:00:00.000Z');

describe('createSessionsSetUpBackoff', () => {
  it('does not back off before setting up failed', () => {
    expect(createSessionsSetUpBackoff().isBackingOff(NOW)).toBe(false);
  });

  it('backs off for an hour after setting up failed', () => {
    const backoff = createSessionsSetUpBackoff();
    backoff.failed(NOW);

    expect(backoff.isBackingOff(NOW + SESSIONS_SET_UP_BACKOFF_MS - 1)).toBe(true);
    expect(backoff.isBackingOff(NOW + SESSIONS_SET_UP_BACKOFF_MS)).toBe(false);
  });

  it('stops backing off once setting up works', () => {
    const backoff = createSessionsSetUpBackoff();
    backoff.failed(NOW);
    backoff.succeeded();

    expect(backoff.isBackingOff(NOW)).toBe(false);
  });
});
