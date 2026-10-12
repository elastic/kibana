/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { TIMEZONE_OPTIONS } from './timezones';

describe('TIMEZONE_OPTIONS', () => {
  it('lists UTC first, then IANA timezones with their current GMT offset', () => {
    expect(TIMEZONE_OPTIONS[0].value).toBe('UTC');
    expect(TIMEZONE_OPTIONS).toContainEqual({
      value: 'Asia/Tokyo',
      label: 'Asia/Tokyo',
      help: 'GMT+9',
    });
  });

  it('only lists timezones that moment recognizes, once each', () => {
    const values = TIMEZONE_OPTIONS.map(({ value }) => value);
    expect(values.filter((value) => !moment.tz.zone(value))).toEqual([]);
    expect(new Set(values).size).toBe(values.length);
  });
});
