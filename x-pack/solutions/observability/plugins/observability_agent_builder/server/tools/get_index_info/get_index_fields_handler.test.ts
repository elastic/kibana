/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFieldPaths } from './get_index_fields_handler';

describe('extractFieldPaths', () => {
  it('extracts top-level keys from a flat object', () => {
    expect(extractFieldPaths({ a: 1, b: 'hello' })).toEqual(['a', 'b']);
  });

  it('extracts dot-notation paths from nested objects', () => {
    expect(extractFieldPaths({ a: { b: 1, c: 2 } })).toEqual(['a.b', 'a.c']);
  });

  it('handles deeply nested objects', () => {
    expect(extractFieldPaths({ a: { b: { c: { d: 1 } } } })).toEqual(['a.b.c.d']);
  });

  it('treats arrays as leaf values', () => {
    expect(extractFieldPaths({ tags: ['foo', 'bar'] })).toEqual(['tags']);
  });

  it('treats null as a leaf value', () => {
    expect(extractFieldPaths({ a: null })).toEqual(['a']);
  });

  it('returns an empty array for an empty object', () => {
    expect(extractFieldPaths({})).toEqual([]);
  });

  it('handles a mix of nested and leaf values', () => {
    const result = extractFieldPaths({
      service: { name: 'web', environment: 'prod' },
      '@timestamp': '2024-01-01',
      tags: ['a'],
      host: { os: { platform: 'linux' } },
    });

    expect(result).toEqual([
      'service.name',
      'service.environment',
      '@timestamp',
      'tags',
      'host.os.platform',
    ]);
  });
});
