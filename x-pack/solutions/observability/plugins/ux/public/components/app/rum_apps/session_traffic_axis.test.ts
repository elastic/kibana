/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatSessionTrafficAxis, formatSessionTrafficTooltip } from './session_traffic_axis';

const TS = Date.parse('2026-08-17T15:00:00.000Z');

describe('formatSessionTrafficAxis', () => {
  it('uses clock time on a 24h range', () => {
    expect(formatSessionTrafficAxis(TS, 24 * 60 * 60 * 1000, 'en-US')).toMatch(/\d{1,2}:\d{2}/);
  });

  it('uses month and day on a week range', () => {
    expect(formatSessionTrafficAxis(TS, 7 * 24 * 60 * 60 * 1000, 'en-US')).toBe('Aug 17');
  });

  it('uses month and year on a long range', () => {
    expect(formatSessionTrafficAxis(TS, 90 * 24 * 60 * 60 * 1000, 'en-US')).toBe('Aug 2026');
  });
});

describe('formatSessionTrafficTooltip', () => {
  it('includes weekday and clock time on a short range', () => {
    const label = formatSessionTrafficTooltip(TS, 24 * 60 * 60 * 1000, 'en-US');
    expect(label).toContain('Aug');
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });
});
