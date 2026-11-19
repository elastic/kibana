/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMobileSessionDocuments } from './mobile_summary_documents';
import { attributeColumn } from './summary_queries';

const row = {
  service: 'shop-ios',
  session: 'Session-1',
  start_time: '2026-11-10T10:00:00.000Z',
  end_time: '2026-11-10T10:05:00.000Z',
  event_count: 40,
  crash_count: 1,
  screen_view_count: 6,
  tap_count: 12,
  http_request_count: 9,
  http_failed_request_count: 2,
  [attributeColumn('environment')]: 'production',
  [attributeColumn('user')]: 'ana@example.com',
  [attributeColumn('appVersion')]: '2.3.0',
  [attributeColumn('appBuildId')]: '230',
  [attributeColumn('deviceModel')]: 'iPhone15,2',
  [attributeColumn('deviceManufacturer')]: 'Apple',
  [attributeColumn('os')]: 'iOS',
  [attributeColumn('osVersion')]: '18.1',
  [attributeColumn('networkConnectionType')]: 'wifi',
  [attributeColumn('countryIso')]: 'NL',
  [attributeColumn('region')]: 'North Holland',
  [attributeColumn('city')]: 'Amsterdam',
};

describe('toMobileSessionDocuments', () => {
  it('turns a row into a summary, searchable by its id and attributes', () => {
    expect(toMobileSessionDocuments([row])).toEqual([
      {
        session: { id: 'Session-1' },
        service: { name: 'shop-ios' },
        start_time: row.start_time,
        end_time: row.end_time,
        duration_ms: 5 * 60 * 1000,
        event_count: 40,
        crash_count: 1,
        screen_view_count: 6,
        tap_count: 12,
        http_request_count: 9,
        http_failed_request_count: 2,
        environment: 'production',
        user: { key: 'ana@example.com' },
        app: { version: '2.3.0', build_id: '230' },
        device: { model: 'iPhone15,2', manufacturer: 'Apple' },
        os: { name: 'iOS', version: '18.1' },
        network: { connection_type: 'wifi' },
        geo: { country_iso: 'NL', region: 'North Holland', city: 'Amsterdam' },
        search: [
          'session-1',
          'ana@example.com',
          '2.3.0',
          'iphone15,2',
          'ios',
          '18.1',
          'nl',
          'amsterdam',
        ],
      },
    ]);
  });

  it('defaults missing counts and attributes', () => {
    const [document] = toMobileSessionDocuments([
      {
        service: 'shop-android',
        session: 's',
        start_time: row.start_time,
        end_time: row.start_time,
      },
    ]);

    expect(document).toEqual(
      expect.objectContaining({
        duration_ms: 0,
        event_count: 0,
        crash_count: 0,
        tap_count: 0,
        environment: null,
        app: { version: null, build_id: null },
        search: ['s'],
      })
    );
  });

  it.each(['service', 'session', 'start_time', 'end_time'])('skips a row without %s', (column) => {
    expect(toMobileSessionDocuments([{ ...row, [column]: null }])).toEqual([]);
  });
});
