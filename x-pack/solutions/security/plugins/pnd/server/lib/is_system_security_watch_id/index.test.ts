/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';
import { isSystemSecurityWatchId } from '.';

describe('isSystemSecurityWatchId', () => {
  it.each(SYSTEM_SECURITY_WATCH_IDS)('returns true for the managed watch id "%s"', (watchId) => {
    expect(isSystemSecurityWatchId(watchId)).toBe(true);
  });

  it('returns false for an unknown watch id', () => {
    expect(isSystemSecurityWatchId('system-security-watch-unknown')).toBe(false);
  });

  it('returns false for a path-traversal payload (security finding S4)', () => {
    expect(isSystemSecurityWatchId('../../evil')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isSystemSecurityWatchId('')).toBe(false);
  });
});
