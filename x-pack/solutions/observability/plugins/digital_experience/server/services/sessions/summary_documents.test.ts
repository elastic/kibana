/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SESSIONS_FRUSTRATION_VALUES } from '../../../common/sessions';
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
  rage_click_count: 2,
  dead_click_count: 1,
  error_click_count: 0,
  frustration_count: 3,
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
  attribute_app_version: '2.4.0',
  lcp_p75: 2100.5,
  lcp_samples: 4,
  lcp_good: 2,
  lcp_up_to_needs_improvement: 3,
  inp_p75: null,
  inp_samples: 0,
  inp_good: 0,
  inp_up_to_needs_improvement: 0,
  load_time_p75: 1800,
  load_time_samples: 1,
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
      service: { name: 'storefront-web', version: '2.4.0' },
      start_time: '2026-11-10T10:00:00.000Z',
      end_time: '2026-11-10T10:05:00.000Z',
      duration_ms: 300_000,
      event_count: 20,
      page_view_count: 3,
      page_load_count: 1,
      click_count: 4,
      js_error_count: 2,
      rage_click_count: 2,
      dead_click_count: 1,
      error_click_count: 0,
      frustration_count: 3,
      frustration_targets: [],
      frustration_pages: [],
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
      load_time: { p75: 1800, count: 1 },
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

  it('has no load time without a page load that finished loading', () => {
    const [document] = toSessionDocuments([
      summaryRow({ load_time_p75: null, load_time_samples: 0 }),
    ]);

    expect(document.load_time).toEqual({ p75: null, count: 0 });
  });

  it('counts no frustration for a row without the columns', () => {
    const [document] = toSessionDocuments([
      summaryRow({
        rage_click_count: null,
        dead_click_count: null,
        error_click_count: null,
        frustration_count: null,
      }),
    ]);

    expect(document).toMatchObject({
      rage_click_count: 0,
      dead_click_count: 0,
      error_click_count: 0,
      frustration_count: 0,
    });
  });

  it('keeps the frustrated selectors, and the page paths of the frustrated URLs, without repeats', () => {
    const [document] = toSessionDocuments([
      summaryRow({
        frustration_targets: ['#buy', 'button.promo', '#buy'],
        frustration_urls: [
          'https://shop.example.com/cart?item=1',
          'https://shop.example.com/cart?item=2',
          'https://shop.example.com/checkout?step=pay',
        ],
      }),
    ]);

    expect(document).toMatchObject({
      frustration_targets: ['#buy', 'button.promo'],
      frustration_pages: ['/cart', '/checkout'],
    });
  });

  it('takes a single frustrated selector and URL, which ES|QL returns as values rather than lists', () => {
    const [document] = toSessionDocuments([
      summaryRow({ frustration_targets: '#buy', frustration_urls: 'https://shop.example.com/' }),
    ]);

    expect(document).toMatchObject({ frustration_targets: ['#buy'], frustration_pages: ['/'] });
  });

  it('keeps the frustrated selectors and pages with the most signals, in the order the query ranks them', () => {
    // The query returns them by signals, most first, which is not their sorted order.
    const ranked = Array.from({ length: 30 }, (_, index) =>
      String(index).padStart(2, '0')
    ).reverse();
    const [document] = toSessionDocuments([
      summaryRow({
        frustration_targets: ranked.map((index) => `#target-${index}`),
        frustration_urls: ranked.flatMap((index) => [
          `https://shop.example.com/page-${index}?q=1`,
          `https://shop.example.com/page-${index}?q=2`,
        ]),
      }),
    ]);

    const kept = ranked.slice(0, SESSIONS_FRUSTRATION_VALUES);
    expect(document.frustration_targets).toEqual(kept.map((index) => `#target-${index}`));
    expect(document.frustration_pages).toEqual(kept.map((index) => `/page-${index}`));
  });

  it('has no application version when the events report none', () => {
    const [document] = toSessionDocuments([summaryRow({ attribute_app_version: null })]);

    expect(document.service).toEqual({ name: 'storefront-web', version: null });
  });

  it('falls back to "Mobile" or "Desktop" from browser.mobile without a device model or type', () => {
    const deviceOf = (overrides: EsqlRow) =>
      toSessionDocuments([summaryRow(overrides)])[0].user_agent.device;

    expect(deviceOf({ attribute_mobile: 'true' })).toBe('Mobile');
    expect(deviceOf({ attribute_mobile: 'false' })).toBe('Desktop');
    expect(deviceOf({ attribute_device: 'iPhone', attribute_mobile: 'true' })).toBe('iPhone');
    expect(deviceOf({ attribute_mobile: null })).toBeNull();
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
