/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sourceLocationRt } from './source_location_codec';

describe('sourceLocationRt', () => {
  it('decodes a source location', () => {
    /** Holds the codec result whose acceptance is asserted by the test. */
    const result = sourceLocationRt.decode({
      excerpt: 'logger.error(message);',
      line: 42,
      path: 'src/payments/authorize.ts',
    });

    expect(result._tag).toBe('Right');
  });

  it('rejects an excerpt larger than 16 KiB before or after UTF-8 encoding', () => {
    expect(
      sourceLocationRt.decode({
        excerpt: 'a'.repeat(16_385),
        line: 1,
        path: 'src/payments/authorize.ts',
      })._tag
    ).toBe('Left');
    expect(
      sourceLocationRt.decode({
        excerpt: '😀'.repeat(4_097),
        line: 1,
        path: 'src/payments/authorize.ts',
      })._tag
    ).toBe('Left');
  });

  it('rejects Windows drive-qualified paths and unsafe integer lines', () => {
    expect(
      sourceLocationRt.decode({ excerpt: 'log', line: 1, path: 'C:/repository/file.ts' })._tag
    ).toBe('Left');
    expect(
      sourceLocationRt.decode({ excerpt: 'log', line: 1, path: 'C:repository/file.ts' })._tag
    ).toBe('Left');
    expect(
      sourceLocationRt.decode({
        excerpt: 'log',
        line: Number.MAX_SAFE_INTEGER + 1,
        path: 'src/file.ts',
      })._tag
    ).toBe('Left');
  });

  it('rejects a source location with a non-numeric line', () => {
    /** Holds the codec result whose acceptance is asserted by the test. */
    const result = sourceLocationRt.decode({
      excerpt: 'logger.error(message);',
      line: '42',
      path: 'src/payments/authorize.ts',
    });

    expect(result._tag).toBe('Left');
  });
});
