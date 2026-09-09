/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeCursor, decodeCursor } from './report_cursor';

describe('report_cursor', () => {
  it('returns a round-tripped cursor payload', () => {
    const sortValues: [number, string] = [0.87, 'default:abc123'];
    const encoded = encodeCursor(sortValues);
    expect(decodeCursor(encoded)).toEqual({ version: 1, sortValues });
  });

  it('returns a round-tripped null primary sort value', () => {
    const encoded = encodeCursor([null, 'doc-id']);
    expect(decodeCursor(encoded).sortValues[0]).toBeNull();
  });

  it('returns a round-tripped string primary sort value', () => {
    const encoded = encodeCursor(['2024-01-15T12:00:00.000Z', 'doc-id']);
    expect(decodeCursor(encoded).sortValues[0]).toBe('2024-01-15T12:00:00.000Z');
  });

  it('returns a non-empty opaque string', () => {
    const encoded = encodeCursor([1, 'id']);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('throws on a completely invalid token', () => {
    expect(() => decodeCursor('not-valid-base64url-json')).toThrow();
  });

  it('throws when version is wrong', () => {
    const bad = Buffer.from(JSON.stringify({ version: 99, sortValues: [1, 'x'] })).toString(
      'base64url'
    );
    expect(() => decodeCursor(bad)).toThrow('Invalid or unsupported cursor');
  });

  it('throws when sortValues is missing', () => {
    const bad = Buffer.from(JSON.stringify({ version: 1 })).toString('base64url');
    expect(() => decodeCursor(bad)).toThrow('Invalid or unsupported cursor');
  });

  it('throws when sortValues length is wrong', () => {
    const bad = Buffer.from(JSON.stringify({ version: 1, sortValues: [1] })).toString('base64url');
    expect(() => decodeCursor(bad)).toThrow('Invalid or unsupported cursor');
  });

  it('throws when the id tiebreak is not a string', () => {
    const bad = Buffer.from(JSON.stringify({ version: 1, sortValues: [1, 2] })).toString(
      'base64url'
    );
    expect(() => decodeCursor(bad)).toThrow('Invalid or unsupported cursor');
  });
});
