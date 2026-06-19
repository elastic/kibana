/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIcon } from './utils';

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
