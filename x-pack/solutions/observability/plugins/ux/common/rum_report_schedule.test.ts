/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatScheduleLabel,
  normalizeScheduleSpec,
  parseRecipientList,
} from './rum_report_schedule';
import { textToPdfBuffer } from './rum_report_pdf';

describe('normalizeScheduleSpec', () => {
  it('defaults a weekly Monday 08:00 UTC schedule', () => {
    expect(normalizeScheduleSpec({})).toEqual({
      cadence: 'weekly',
      weekday: 'MO',
      monthday: 1,
      hour: 8,
      minute: 0,
      tzid: 'UTC',
    });
  });

  it('clamps hour and snaps minutes', () => {
    expect(normalizeScheduleSpec({ hour: 30, minute: 22, monthday: 40, cadence: 'daily' })).toEqual(
      expect.objectContaining({
        cadence: 'daily',
        hour: 23,
        minute: 15,
        monthday: 28,
      })
    );
  });
});

describe('formatScheduleLabel', () => {
  it('summarizes weekly and weekday cadences', () => {
    expect(
      formatScheduleLabel({ cadence: 'weekly', weekday: 'FR', hour: 17, minute: 0 })
    ).toContain('Friday');
    expect(formatScheduleLabel({ cadence: 'weekdays', hour: 8, minute: 0 })).toContain('Weekdays');
  });
});

describe('parseRecipientList', () => {
  it('splits, lowercases, and caps unique emails', () => {
    expect(parseRecipientList('Ada@Example.com, ada@example.com; ops@elastic.co')).toEqual([
      'ada@example.com',
      'ops@elastic.co',
    ]);
    expect(parseRecipientList('not-an-email not@valid')).toEqual(['not@valid']);
  });
});

describe('textToPdfBuffer', () => {
  it('emits a PDF with the source text', () => {
    const pdf = textToPdfBuffer('# Weekly UX scorecard\nSessions: 10');
    const raw = pdf.toString('latin1');
    expect(raw.startsWith('%PDF-1.4')).toBe(true);
    expect(raw).toContain('Weekly UX scorecard');
    expect(raw).toContain('%%EOF');
  });
});
