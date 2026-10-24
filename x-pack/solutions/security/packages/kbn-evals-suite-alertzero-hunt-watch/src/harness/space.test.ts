/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_WATCH_SPACE_ENV, alertsIndexForSpace, huntWatchSpaceId } from './space';

describe('hunt watch space id', () => {
  afterEach(() => {
    delete process.env[HUNT_WATCH_SPACE_ENV];
  });

  it('defaults to the default space when the env var is unset', () => {
    expect(huntWatchSpaceId()).toBe('default');
  });

  it('reads the space from the env when set', () => {
    process.env[HUNT_WATCH_SPACE_ENV] = 'hunt-watch-eis';
    expect(huntWatchSpaceId()).toBe('hunt-watch-eis');
  });

  it('treats blank values as unset (default space)', () => {
    process.env[HUNT_WATCH_SPACE_ENV] = '   ';
    expect(huntWatchSpaceId()).toBe('default');
  });

  it('derives the alerts index from the space id', () => {
    expect(alertsIndexForSpace('default')).toBe('.alerts-security.alerts-default');
    expect(alertsIndexForSpace('hunt-watch-eis')).toBe('.alerts-security.alerts-hunt-watch-eis');
  });
});
