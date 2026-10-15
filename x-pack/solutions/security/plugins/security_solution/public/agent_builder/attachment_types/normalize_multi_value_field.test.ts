/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeMultiValueField } from './normalize_multi_value_field';

describe('normalizeMultiValueField', () => {
  it('wraps a single non-empty string in a one-element array', () => {
    expect(normalizeMultiValueField('one')).toEqual(['one']);
  });

  it('returns a filtered copy of an array of strings', () => {
    expect(normalizeMultiValueField(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('drops empty strings and non-string entries from an array', () => {
    expect(normalizeMultiValueField(['a', '', null, 1, undefined, 'b'])).toEqual(['a', 'b']);
  });

  it('returns an empty array for an empty string', () => {
    expect(normalizeMultiValueField('')).toEqual([]);
  });

  it('returns an empty array for null or undefined', () => {
    expect(normalizeMultiValueField(undefined)).toEqual([]);
    expect(normalizeMultiValueField(null)).toEqual([]);
  });
});
