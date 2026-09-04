/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeJsonControlChars } from './escape_json_control_chars';

describe('escapeJsonControlChars', () => {
  it('escapes a raw newline inside a string value so the text parses (reported crash payload)', () => {
    // A rule whose `description` contains a raw line break, as emitted by a hand-stringified edit.
    const corrupt = '{"name":"from limit 10","description":"from limit 10\n"}';
    expect(() => JSON.parse(corrupt)).toThrow();

    const parsed = JSON.parse(escapeJsonControlChars(corrupt));
    expect(parsed.name).toBe('from limit 10');
    expect(parsed.description).toBe('from limit 10\n');
  });

  it('escapes tabs and carriage returns inside strings', () => {
    const corrupt = '{"a":"x\ty\r"}';
    expect(JSON.parse(escapeJsonControlChars(corrupt))).toEqual({ a: 'x\ty\r' });
  });

  it('leaves already-valid JSON unchanged and is idempotent', () => {
    const valid = JSON.stringify({ description: 'line1\nline2', name: 'ok' });
    expect(escapeJsonControlChars(valid)).toBe(valid);
    expect(escapeJsonControlChars(escapeJsonControlChars(valid))).toBe(valid);
  });

  it('does not alter structural newlines between tokens (pretty-printed JSON)', () => {
    const pretty = JSON.stringify({ a: 1, b: 'x' }, null, 2);
    expect(escapeJsonControlChars(pretty)).toBe(pretty);
    expect(JSON.parse(escapeJsonControlChars(pretty))).toEqual({ a: 1, b: 'x' });
  });

  it('does not flip string state on escaped quotes', () => {
    const corrupt = '{"a":"he said \\"hi\\"\n"}';
    expect(JSON.parse(escapeJsonControlChars(corrupt))).toEqual({ a: 'he said "hi"\n' });
  });
});
