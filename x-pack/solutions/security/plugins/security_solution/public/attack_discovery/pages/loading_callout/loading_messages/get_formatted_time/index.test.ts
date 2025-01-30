/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedDate } from '.';

describe('getFormattedDate', () => {
  it('returns null if date is null', () => {
    const result = getFormattedDate({
      date: null, // <-- null
      dateFormat: 'YYYY-MM-DD',
    });

    expect(result).toBeNull();
  });

  it('returns null if date is undefined', () => {
    const result = getFormattedDate({
      date: undefined, // <-- undefined
      dateFormat: 'YYYY-MM-DD',
    });

    expect(result).toBeNull();
  });

  it('returns the original date if it cannot be parsed', () => {
    const result = getFormattedDate({
      date: 'now', // <-- this relative date cannot be parsed
      dateFormat: 'YYYY-MM-DD',
    });

    expect(result).toBe('now');
  });

  it('returns the formatted date if the date is valid', () => {
    const result = getFormattedDate({
      date: '2024-10-25T11:12:13Z', // <-- valid
      dateFormat: 'YYYY-MM-DD',
    });

    expect(result).toBe('2024-10-25');
  });
});
