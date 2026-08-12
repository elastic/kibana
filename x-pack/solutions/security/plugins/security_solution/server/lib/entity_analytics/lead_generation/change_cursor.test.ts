/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeCursor, decodeCursor } from './change_cursor';

describe('change_cursor', () => {
  it('round-trips a cursor', () => {
    const updatedAt = 1_700_000_000_000;
    const docId = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const encoded = encodeCursor(updatedAt, docId);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual({ version: 1, updatedAt, docId });
  });

  it('round-trips a cursor with empty docId (no-hit sentinel)', () => {
    const encoded = encodeCursor(1_700_000_000_000, '');
    const decoded = decodeCursor(encoded);
    expect(decoded.docId).toBe('');
  });

  it('produces a non-empty opaque string', () => {
    const encoded = encodeCursor(1_700_000_000_000, 'someid');
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('throws on a completely invalid token', () => {
    expect(() => decodeCursor('not-valid-base64url-json')).toThrow();
  });

  it('throws when version is wrong', () => {
    const bad = Buffer.from(JSON.stringify({ version: 99, updatedAt: 123, docId: 'x' })).toString(
      'base64url'
    );
    expect(() => decodeCursor(bad)).toThrow('Invalid or unsupported cursor');
  });

  it('throws when updatedAt is missing', () => {
    const bad = Buffer.from(JSON.stringify({ version: 1, docId: 'x' })).toString('base64url');
    expect(() => decodeCursor(bad)).toThrow('Invalid or unsupported cursor');
  });

  it('throws when docId is missing', () => {
    const bad = Buffer.from(JSON.stringify({ version: 1, updatedAt: 123 })).toString('base64url');
    expect(() => decodeCursor(bad)).toThrow('Invalid or unsupported cursor');
  });
});
