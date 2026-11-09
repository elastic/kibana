/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';

export const ES_ARCHIVES = {
  RUM_TEST_DATA: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_test_data',
};

export const TIME_RANGE = {
  rangeFrom: '2021-01-18T12:00:00.000Z',
  rangeTo: '2021-01-18T13:00:00.000Z',
};

/**
 * Has page loads in both sources inside `TIME_RANGE`: Classic RUM in `RUM_TEST_DATA` and EDOT
 * Browser in the mock OTel data.
 */
export const SERVICE_NAME = 'elastic-co-frontend';

/** The other EDOT Browser applications of the mock OTel data (`otel_rum_data.ndjson`). */
export const OTEL_APPS = {
  shop: 'otel-shop',
  checkout: 'otel-checkout',
  /** The only one in `STAGING_ENVIRONMENT`. */
  docs: 'otel-docs',
  /** The only one without an environment ("Not defined"). */
  blog: 'otel-blog',
} as const;

/** The page loads of `OTEL_APPS.shop` inside `TIME_RANGE`, as its Overview KPI shows them. */
export const OTEL_SHOP_PAGE_LOADS = '5';

/**
 * Of the page loads of `OTEL_APPS.shop`, three are from Chrome on macOS in Germany, one from Safari
 * on iOS in France, and one has no browser. The OS is in `browser.platform`, one of the
 * alternatives the sessions transform reads too.
 */
export const OTEL_SHOP_CHROME_PAGE_LOADS = '3';
export const OTEL_SHOP_SAFARI_PAGE_LOADS = '1';

export const STAGING_ENVIRONMENT = 'staging';

/**
 * The usage of `OTEL_APPS.shop` inside `TIME_RANGE`; every duration is a
 * single sample, so the percentiles are exact.
 */
export const OTEL_SHOP_USAGE = {
  topPages: [
    { url: 'https://otel-shop.example.com/', pageLoads: 3, loadTimeP75Ms: null },
    { url: 'https://otel-shop.example.com/products', pageLoads: 2, loadTimeP75Ms: 1200 },
  ],
  // A page load without browser attributes and a click without a selector sit in no row.
  breakdowns: {
    pageLoads: 5,
    browsers: [
      { name: 'Chrome', pageLoads: 3 },
      { name: 'Safari', pageLoads: 1 },
    ],
    operatingSystems: [
      { name: 'macOS', pageLoads: 3 },
      { name: 'iOS', pageLoads: 1 },
    ],
    devices: [
      { name: 'desktop', pageLoads: 3 },
      { name: 'mobile', pageLoads: 1 },
    ],
  },
  topClicks: [
    { cssSelector: '#add-to-cart', tagName: 'BUTTON', count: 2 },
    { cssSelector: '.nav-link', tagName: 'A', count: 1 },
  ],
  totalClicks: 4,
} as const;

/** The Errors tab of `OTEL_APPS.shop` inside `TIME_RANGE`. */
export const OTEL_SHOP_ERRORS = [
  {
    type: 'TypeError',
    stacktrace: 'TypeError: x is undefined\n    at checkout (app.js:10:5)',
    message: 'x is undefined',
    count: 1,
    lastSeen: '2021-01-18T12:20:00.000Z',
  },
] as const;

/** The Network tab of `OTEL_APPS.shop` inside `TIME_RANGE`. */
export const OTEL_SHOP_NETWORK = {
  httpRequests: [
    {
      method: 'GET',
      url: 'https://otel-shop.example.com/api',
      count: 4,
      p95Ms: 12.5,
      failedCount: 0,
      failedRatio: 0,
    },
    {
      method: 'POST',
      url: 'https://otel-shop.example.com/api/checkout',
      count: 1,
      p95Ms: 50,
      failedCount: 1,
      failedRatio: 1,
    },
  ],
  slowestResources: [
    {
      url: 'https://otel-shop.example.com/static/app.js',
      initiatorType: 'script',
      renderBlocking: true,
      count: 1,
      p75Ms: 1800,
      transferSizeP75Bytes: 120000,
    },
    {
      url: 'https://otel-shop.example.com/static/style.css',
      initiatorType: 'link',
      renderBlocking: false,
      count: 1,
      p75Ms: 900,
      transferSizeP75Bytes: 20000,
    },
    {
      url: 'https://otel-shop.example.com/static/logo.svg',
      initiatorType: 'img',
      renderBlocking: false,
      count: 1,
      p75Ms: 300,
      transferSizeP75Bytes: 4096,
    },
  ],
} as const;

export const createRole = (feature: KibanaRole['kibana'][number]['feature']): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

export const DIGITAL_EXPERIENCE_READ_ROLE = createRole({
  digital_experience: ['read'],
  apm: ['read'],
});

/** Digital Experience without APM, whose routes the app reads its data through. */
export const DIGITAL_EXPERIENCE_ONLY_ROLE = createRole({ digital_experience: ['read'] });

/** An existing APM user that was never granted Digital Experience. */
export const APM_ONLY_ROLE = createRole({ apm: ['read'] });
