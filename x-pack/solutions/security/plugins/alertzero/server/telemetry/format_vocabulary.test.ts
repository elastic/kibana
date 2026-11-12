/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatVocabulary } from './format_vocabulary';

describe('formatVocabulary', () => {
  it.each<{ expected: string; title: string; values: string[] }>([
    {
      expected: '`manual`, `assisted` or `supervised`',
      title: 'lists three or more values with commas and a final `or`',
      values: ['manual', 'assisted', 'supervised'],
    },
    {
      expected: '`gated` or `auto_accept`',
      title: 'joins two values with `or`',
      values: ['gated', 'auto_accept'],
    },
    { expected: '`produced`', title: 'returns a single value on its own', values: ['produced'] },
    { expected: '', title: 'returns an empty string for no values', values: [] },
  ])('$title', ({ expected, values }) => {
    const result = formatVocabulary(values);

    expect(result).toBe(expected);
  });
});
