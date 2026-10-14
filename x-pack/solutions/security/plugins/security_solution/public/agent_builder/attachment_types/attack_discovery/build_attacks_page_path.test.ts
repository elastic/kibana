/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';
import { buildAttacksPagePath } from './build_attacks_page_path';

describe('buildAttacksPagePath', () => {
  it('filters the query to the attack ids', () => {
    const path = buildAttacksPagePath(['a', 'b'], '2026-09-01T00:00:00.000Z');

    expect(decode(new URLSearchParams(path).get('query') ?? '')).toEqual({
      language: 'kuery',
      query: '_id: ("a" or "b")',
    });
  });

  it('escapes quotes in ids and keeps reserved characters inside their own parameter', () => {
    const path = buildAttacksPagePath(['a"b', 'c&d#e'], '2026-09-01T00:00:00.000Z');

    const params = new URLSearchParams(path);
    expect([...params.keys()]).toEqual(['query', 'timerange']);
    expect(path).not.toMatch(/#/);
    expect(decode(params.get('query') ?? '')).toEqual({
      language: 'kuery',
      query: '_id: ("a\\"b" or "c&d#e")',
    });
  });

  it('covers the 28 days before the given creation time', () => {
    const path = buildAttacksPagePath(['a'], '2026-09-29T00:00:00.000Z');

    const { global } = decode(new URLSearchParams(path).get('timerange') ?? '') as {
      global: { timerange: { from: string } };
    };
    expect(global.timerange.from).toBe('2026-09-01T00:00:00.000Z');
  });
});
