/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIcon, MAX_RECENT_LEADS } from './utils';

describe('getEntityIcon', () => {
  it('returns "user" for user entity type', () => {
    expect(getEntityIcon('user')).toBe('user');
  });

  it('returns "storage" for host entity type', () => {
    expect(getEntityIcon('host')).toBe('storage');
  });

  it('returns "node" for service entity type', () => {
    expect(getEntityIcon('service')).toBe('node');
  });

  it('returns "globe" for generic entity type', () => {
    expect(getEntityIcon('generic')).toBe('globe');
  });

  it('returns "globe" as fallback icon for unknown entity type', () => {
    expect(getEntityIcon('unknown')).toBe('globe');
  });
});

describe('MAX_RECENT_LEADS', () => {
  it('is derived from the per-run engine cap and stays at 20', () => {
    // Guards against silent drift between the per-run lead cap
    // (MAX_LEADS_PER_RUN) and the recent-leads ceiling surfaced in the UI.
    expect(MAX_RECENT_LEADS).toBe(20);
  });
});
