/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatKeepClause } from '.';

describe('formatKeepClause', () => {
  it('returns a KEEP clause with no fields when given an empty array', () => {
    expect(formatKeepClause([])).toBe('  | KEEP');
  });

  it('formats a single field on its own line without a trailing comma', () => {
    expect(formatKeepClause(['_id'])).toBe(['  | KEEP', '      _id'].join('\n'));
  });

  it('formats multiple fields with each on its own line', () => {
    const result = formatKeepClause(['_id', '@timestamp', 'host.name']);

    expect(result).toBe(
      ['  | KEEP', '      _id,', '      @timestamp,', '      host.name'].join('\n')
    );
  });

  it('adds trailing commas to all fields except the last', () => {
    const result = formatKeepClause(['a', 'b', 'c']);

    const lines = result.split('\n');
    expect(lines[1]).toBe('      a,');
    expect(lines[2]).toBe('      b,');
    expect(lines[3]).toBe('      c');
  });

  it('indents the pipe with 2 spaces', () => {
    const result = formatKeepClause(['_id']);

    expect(result).toMatch(/^ {2}\|/);
  });

  it('indents each field with 6 spaces', () => {
    const result = formatKeepClause(['_id', '@timestamp']);

    const fieldLines = result.split('\n').slice(1);
    for (const line of fieldLines) {
      expect(line).toMatch(/^ {6}\S/);
    }
  });
});
