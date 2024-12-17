/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTimestamp } from './parse_timestamp';

describe('parseTimestamp', () => {
  it('handles numeric timestamps', () => {
    const result = parseTimestamp('949203194403');
    expect(result.toISOString()).toEqual('2000-01-30T03:33:14.403Z');
  });

  it('handles ISO string', () => {
    const result = parseTimestamp('2000-01-30T03:33:14.403Z');
    expect(result.toISOString()).toEqual('2000-01-30T03:33:14.403Z');
  });

  it('handles a date string timestamp', () => {
    const result = parseTimestamp(new Date('2000-01-30T03:33:14.403Z').toString());
    expect(result.toISOString()).toEqual('2000-01-30T03:33:14.000Z');
  });
});
