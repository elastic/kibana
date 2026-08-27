/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeStoredFlags } from './read_stored_flags';

describe('sanitizeStoredFlags', () => {
  it('keeps vendor endpoint flags', () => {
    expect(sanitizeStoredFlags({ supabase: true, vercel: true })).toEqual({
      supabase: true,
      vercel: true,
    });
  });

  it('drops entries whose value is not exactly true', () => {
    expect(sanitizeStoredFlags({ supabase: 'yes', opentelemetry: true, vercel: 1 })).toEqual({
      opentelemetry: true,
    });
  });

  it('returns an empty object for non-object input', () => {
    expect(sanitizeStoredFlags(null)).toEqual({});
    expect(sanitizeStoredFlags([true])).toEqual({});
    expect(sanitizeStoredFlags('supabase')).toEqual({});
  });
});
