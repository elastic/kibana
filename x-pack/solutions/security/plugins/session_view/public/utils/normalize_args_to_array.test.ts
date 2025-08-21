/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeArgsToArray } from './normalize_args_to_array';

describe('normalizeArgsToArray', () => {
  it('should return empty array for undefined', () => {
    expect(normalizeArgsToArray(undefined)).toEqual([]);
  });

  it('should wrap string in array', () => {
    expect(normalizeArgsToArray('command')).toEqual(['command']);
  });

  it('should return array unchanged', () => {
    expect(normalizeArgsToArray(['cmd', 'arg1'])).toEqual(['cmd', 'arg1']);
  });

  it('should handle empty string', () => {
    expect(normalizeArgsToArray('')).toEqual(['']);
  });

  it('should handle string with spaces', () => {
    expect(normalizeArgsToArray('command with spaces')).toEqual(['command with spaces']);
  });

  it('should handle empty array', () => {
    expect(normalizeArgsToArray([])).toEqual([]);
  });

  it('should handle array with empty strings', () => {
    expect(normalizeArgsToArray(['', 'arg1', ''])).toEqual(['', 'arg1', '']);
  });

  it('should handle complex command arguments', () => {
    const complexArgs = ['ls', '-la', '/home/user', '--color=auto'];
    expect(normalizeArgsToArray(complexArgs)).toEqual(complexArgs);
  });
});
