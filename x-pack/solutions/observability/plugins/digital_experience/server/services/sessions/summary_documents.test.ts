/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sessionDocumentId,
  toEsqlRows,
  toSessionDocuments,
  type EsqlRow,
} from './summary_documents';

const summaryRow = (overrides: EsqlRow = {}): EsqlRow => ({
  service: 'storefront-web',
  session: 'Session-A',
  start_time: '2026-11-10T10:00:00.000Z',
  end_time: '2026-11-10T10:05:00.000Z',
  event_count: 20,
  page_view_count: 3,
  page_load_count: 1,
  click_count: 4,
  js_error_count: 2,
  http_request_count: 5,
  http_failed_request_count: 1,
  attribute_environment: 'production',
  attribute_user: 'Ana@Example.com',
  attribute_browser: 'Chrome',
  attribute_browser_version: '130',
  attribute_os: 'macOS',
  attribute_device: null,
  attribute_country_iso: 'ES',
  attribute_region: null,
  attribute_city: 'Madrid',
  lcp_p75: 2100.5,
  lcp_samples: 4,
  lcp_good: 2,
  lcp_up_to_needs_improvement: 3,
  inp_p75: null,
  inp_samples: 0,
  inp_good: 0,
  inp_up_to_needs_improvement: 0,
  ...overrides,
});

// The summary query returns the page URLs in first-view order.
const JOURNEY: EsqlRow = {
  pages: [
    'https://shop.example.com/',
    'https://shop.example.com/cart?item=1',
    'https://shop.example.com/cart?item=2',
  ],
  exit: 'https://shop.example.com/checkout#/done',
};

describe('toEsqlRows', () => {
  it('keys each row by its column names', () => {
    expect(
      toEsqlRows({
        columns: [
          { name: 'service', type: 'keyword' },
          { name: 'sessions', type: 'long' },
        ],
        values: [['a', 1]],
      })
    ).toEqual([{ service: 'a', sessions: 1 }]);
  });
});

describe('toSessionDocuments', () => {
  it('builds the summary from both rows of a session', () => {
    const [document] = toSessionDocuments([summaryRow(JOURNEY)]);

    expect(document).toEqual({
      session: { id: 'Session-A' },
      service: { name: 'storefront-web' },
      start_time: '2026-11-10T10:00:00.000Z',
      end_time: '2026-11-10T10:05:00.000Z',
      duration_ms: 300_000,
      event_count: 20,
      page_view_count: 3,
      page_load_count: 1,
      click_count: 4,
      js_error_count: 2,
      http_request_count: 5,
      http_failed_request_count: 1,
      bounced: false,
      // In first-view order, query strings dropped, repeats kept once.
      journey: ['/', '/cart'],
      entry_page: '/',
      exit_page: '/done',
      environment: 'production',
      user: { key: 'Ana@Example.com' },
      user_agent: { browser: 'Chrome', browser_version: '130', os: 'macOS', device: null },
      geo: { country_iso: 'ES', region: null, city: 'Madrid' },
      web_vitals: { lcp: 2100.5, inp: null, cls: null, fcp: null, ttfb: null },
      web_vital_samples: {
        lcp: { count: 4, good: 2, needs_improvement: 1, poor: 1 },
        inp: { count: 0, good: 0, needs_improvement: 0, poor: 0 },
        cls: { count: 0, good: 0, needs_improvement: 0, poor: 0 },
        fcp: { count: 0, good: 0, needs_improvement: 0, poor: 0 },
        ttfb: { count: 0, good: 0, needs_improvement: 0, poor: 0 },
      },
      search: [
        'session-a',
        'ana@example.com',
        'chrome',
        'macos',
        'es',
        'madrid',
        '/done',
        '/',
        '/cart',
      ],
    });
  });

  it('counts a visit that never left its landing page as a bounce', () => {
    const [single] = toSessionDocuments([summaryRow({ pages: ['https://shop.example/'] })]);
    const [several] = toSessionDocuments([
      summaryRow({ pages: ['https://shop.example/', 'https://shop.example/cart'] }),
    ]);
    const [none] = toSessionDocuments([summaryRow()]);

    expect(single.bounced).toBe(true);
    expect(several.bounced).toBe(false);
    // Without a captured page there was none to leave.
    expect(none.bounced).toBe(false);
  });

  it('bounces on the pages seen, not the page views reported for one page', () => {
    const [document] = toSessionDocuments([
      summaryRow({
        pages: ['https://shop.example/', 'https://shop.example/?ref=ad'],
        page_view_count: 2,
      }),
    ]);

    expect(document.bounced).toBe(true);
    expect(document.page_view_count).toBe(2);
  });

  it('takes the entry and exit page from the last view when the journey is empty', () => {
    const [document] = toSessionDocuments([
      summaryRow({ pages: [], exit: 'https://shop.example.com/a?b' }),
    ]);

    expect(document).toMatchObject({ journey: [], entry_page: '/a', exit_page: '/a' });
  });

  it('has no pages without page views', () => {
    const [document] = toSessionDocuments([summaryRow({ pages: null, exit: null })]);

    expect(document).toMatchObject({ journey: [], entry_page: null, exit_page: null });
  });

  it('takes a single page URL, which ES|QL returns as a value rather than a list', () => {
    const [document] = toSessionDocuments([
      summaryRow({ pages: 'https://a.example.com/x|y', exit: [] }),
    ]);

    expect(document.journey).toEqual(['/x|y']);
  });

  it('skips rows without a session, an application or times', () => {
    expect(
      toSessionDocuments([
        summaryRow({ session: null }),
        summaryRow({ service: '' }),
        summaryRow({ end_time: null }),
      ])
    ).toEqual([]);
  });
});

describe('sessionDocumentId', () => {
  it('tells the same session id of two applications apart', () => {
    expect(sessionDocumentId('a', 'session')).not.toBe(sessionDocumentId('b', 'session'));
    expect(sessionDocumentId('a', 'session')).toBe(sessionDocumentId('a', 'session'));
  });
});
