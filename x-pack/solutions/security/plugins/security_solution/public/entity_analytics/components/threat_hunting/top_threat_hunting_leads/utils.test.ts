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

  it('returns "desktop" for host entity type', () => {
    expect(getEntityIcon('host')).toBe('desktop');
  });

  it('returns "gear" for service entity type', () => {
    expect(getEntityIcon('service')).toBe('gear');
  });

  it('returns fallback icon for unknown entity type', () => {
    expect(getEntityIcon('unknown')).toBe('questionInCircle');
  });
});
