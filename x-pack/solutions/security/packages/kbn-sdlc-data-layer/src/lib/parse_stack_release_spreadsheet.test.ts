/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { parseReleaseScheduleDate, parseStackReleaseSpreadsheet } from './parse_stack_release_spreadsheet';

describe('parseReleaseScheduleDate', () => {
  it('parses human-readable stack release dates', () => {
    expect(parseReleaseScheduleDate('Tue, Jun 16 2026')).toBe('2026-06-16');
    expect(parseReleaseScheduleDate('Mon, March 8th 2020')).toBe('2020-03-08');
  });

  it('parses Excel serial numbers', () => {
    expect(parseReleaseScheduleDate('45943')).toBe('2025-10-13');
  });
});

describe('parseStackReleaseSpreadsheet', () => {
  const csv = [
    'Version,Feature Freeze,Build candidate,Public release,Days between FF & GA,Days between public releases,Stack & Solutions Release Manager,Notes',
    '8.19.17,"Tue, Jun 16 2026","Thu, Jun 18 2026","Tue, Jun 23 2026",7,,Kaarina Tungseth,',
    'Previous 6.x releases,,,,,,,',
    '6.7.0,43501,43502,43550,,,,',
  ].join('\n');

  it('expands stack rows into milestone events', () => {
    const events = parseStackReleaseSpreadsheet({
      csv,
      spreadsheetId: 'sheet-id',
      sheetGid: '915204807',
      sheetName: 'Future - Stack Releases',
    });

    expect(events).toHaveLength(6);
    expect(events[0]).toMatchObject({
      releaseLine: 'stack',
      product: 'elastic-stack',
      version: '8.19.17',
      milestone: 'feature_freeze',
      targetDate: '2026-06-16',
      status: 'scheduled',
      releaseManager: 'Kaarina Tungseth',
      source: {
        type: 'spreadsheet',
        spreadsheetId: 'sheet-id',
        sheetGid: '915204807',
      },
    });
    expect(events.map((event) => event.milestone)).toEqual([
      'feature_freeze',
      'build_candidate',
      'public_release',
      'feature_freeze',
      'build_candidate',
      'public_release',
    ]);
  });

  it('skips subheader rows without semver versions', () => {
    const events = parseStackReleaseSpreadsheet({ csv });
    expect(events.some((event) => event.version === 'Previous 6.x releases')).toBe(false);
  });
});
