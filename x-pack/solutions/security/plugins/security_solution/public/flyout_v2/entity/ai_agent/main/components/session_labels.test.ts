/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { formatSessionStart } from './session_labels';

describe('formatSessionStart', () => {
  const now = new Date('2026-11-27T12:00:00.000Z').getTime();
  beforeAll(() => moment.tz.setDefault('UTC'));
  afterAll(() => moment.tz.setDefault());

  it('says today, yesterday, or the weekday and date, with the time', () => {
    expect(formatSessionStart('2026-11-27T09:15:00.000Z', now)).toBe('Today 09:15');
    expect(formatSessionStart('2026-11-26T02:15:00.000Z', now)).toBe('Yesterday 02:15');
    expect(formatSessionStart('2026-11-25T02:15:00.000Z', now)).toBe('Wed, Nov 25 02:15');
  });
});
