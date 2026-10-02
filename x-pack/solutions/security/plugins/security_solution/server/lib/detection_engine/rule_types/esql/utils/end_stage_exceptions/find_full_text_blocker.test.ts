/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findFullTextBlocker } from './find_full_text_blocker';

describe('findFullTextBlocker', () => {
  it.each([
    'FROM logs-* METADATA _id | EVAL msg = message | WHERE n > 0',
    'FROM logs-* | RENAME message AS msg | KEEP msg, n | DROP n',
    'FROM logs-* | SORT @timestamp DESC | EVAL msg = message',
    'FROM logs-* | DISSECT host "%{h}" | GROK host "%{WORD:w}" | MV_EXPAND tags | EVAL msg = message',
  ])('accepts a query that only uses commands that allow a full-text function: %s', (query) => {
    expect(findFullTextBlocker(query)).toBeUndefined();
  });

  it.each([
    ['FROM logs-* | RENAME message AS msg | LIMIT 100', 'limit'],
    ['FROM logs-* | SORT n | LIMIT 3 | KEEP n', 'limit'],
    ['FROM logs-* | STATS c = COUNT(*) BY msg = message', 'stats'],
    ['FROM logs-* | STATS c = COUNT(*) BY message | EVAL msg = message', 'stats'],
    ['FROM logs-* | INLINE STATS t = COUNT(*) | EVAL msg = message', 'inline stats'],
    ['FROM logs-* | SAMPLE 0.5 | EVAL msg = message', 'sample'],
    ['FROM logs-* | LOOKUP JOIN lookup ON host | EVAL msg = message', 'join'],
  ])('returns the command that blocks the function: %s', (query, command) => {
    expect(findFullTextBlocker(query)).toBe(command);
  });

  it('looks inside sub-queries and FORK branches', () => {
    expect(findFullTextBlocker('FROM (FROM a | LIMIT 3), b | EVAL msg = message')).toBe('limit');
    expect(findFullTextBlocker('FROM a | FORK (WHERE x) (WHERE y)')).toBe('fork');
  });

  it('treats a query that cannot be parsed as blocked', () => {
    expect(findFullTextBlocker('FROM a | WHERE | LIMIT')).toBe(
      'a part of the query that could not be parsed'
    );
  });
});
