/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMEZONE_OPTIONS } from './timezones';

describe('TIMEZONE_OPTIONS', () => {
  it('lists common abbreviations first with their GMT offset', () => {
    expect(TIMEZONE_OPTIONS.slice(0, 3)).toEqual([
      { value: 'UTC', label: 'UTC', help: 'GMT' },
      { value: 'GMT', label: 'GMT', help: 'GMT' },
      { value: 'IST', label: 'IST', help: 'GMT+5.5' },
    ]);
  });

  it('includes IANA timezones once', () => {
    const values = TIMEZONE_OPTIONS.map(({ value }) => value);
    expect(values).toContain('Europe/Madrid');
    expect(new Set(values).size).toBe(values.length);
  });
});
