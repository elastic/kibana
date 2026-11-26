/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  esqlDocumentConditions,
  esqlFilterEvals,
  esqlLogConditions,
  esqlPageLoadConditions,
} from './overview_filters_esql';
import { FILTER_SOURCE_FIELDS } from './overview_filters';

describe('overview filters as ES|QL', () => {
  it('has nothing to evaluate or keep without a selection', () => {
    expect(esqlFilterEvals({})).toEqual([]);
    expect(esqlDocumentConditions({})).toEqual([]);
    expect(esqlPageLoadConditions({})).toEqual([]);
  });

  it('coalesces the alternatives of a selected filter, cleaned like the session summaries', () => {
    const [browserEval] = esqlFilterEvals({ browser: [{ value: 'Chrome', exclude: false }] });

    expect(browserEval.startsWith('filter_browser = COALESCE(')).toBe(true);
    FILTER_SOURCE_FIELDS.browser.forEach((field) => {
      expect(browserEval).toContain(`TRIM(TO_STRING(${field}))`);
    });
  });

  it('reads browser.mobile as Mobile or Desktop when no device names the device', () => {
    const [deviceEval] = esqlFilterEvals({ device: [{ value: 'Mobile', exclude: false }] });

    expect(deviceEval).toContain('== "true", "Mobile"');
    expect(deviceEval).toContain('== "false", "Desktop"');
  });

  it('keeps any included value and none of the excluded, also without the field', () => {
    expect(
      esqlDocumentConditions({
        browser: [
          { value: 'Chrome', exclude: false },
          { value: 'Safari', exclude: false },
          { value: 'Edge', exclude: true },
        ],
      })
    ).toEqual([
      'filter_browser IN ("Chrome", "Safari")',
      '(filter_browser IS NULL OR NOT filter_browser IN ("Edge"))',
    ]);
  });

  it('leaves the page to the logs, and keeps it off the documents of every kind', () => {
    const filters = {
      browser: [{ value: 'Chrome', exclude: false }],
      pageUrl: [{ value: 'https://shop.example/cart', exclude: false }],
    };

    expect(esqlDocumentConditions(filters)).toEqual(['filter_browser IN ("Chrome")']);
    // The page narrows the logs; the HTTP request spans carry the URL they request.
    expect(esqlLogConditions(filters)).toEqual([
      'filter_page_url IN ("https://shop.example/cart")',
    ]);
    expect(esqlPageLoadConditions(filters)).toEqual([]);
  });

  it('reads the route of the page first, and its URL when the app reports no route', () => {
    const [pageEval] = esqlFilterEvals({
      pageUrl: [{ value: '/products/{slug}', exclude: false }],
    });

    expect(pageEval.startsWith('filter_page_url = COALESCE(')).toBe(true);
    expect(pageEval.indexOf('attributes.url.template')).toBeGreaterThan(-1);
    expect(pageEval.indexOf('attributes.url.template')).toBeLessThan(
      pageEval.indexOf('attributes.url.full')
    );
  });

  it('matches the URL text on its single field, which needs no column of its own', () => {
    expect(esqlFilterEvals({ pageContains: [{ value: 'cart', exclude: false }] })).toEqual([]);
  });

  it('matches the text of the URL whatever its case, with wildcards as literal text', () => {
    expect(
      esqlPageLoadConditions({
        pageContains: [
          { value: '/Checkout', exclude: false },
          { value: '*promo?', exclude: true },
        ],
      })
    ).toEqual([
      'TO_LOWER(attributes.url.full) LIKE "*/checkout*"',
      '(attributes.url.full IS NULL OR NOT TO_LOWER(attributes.url.full) LIKE "*\\\\*promo\\\\?*")',
    ]);
  });

  it('escapes quotes in the values', () => {
    expect(esqlDocumentConditions({ country: [{ value: 'a"b', exclude: false }] })).toEqual([
      'filter_country IN ("a\\"b")',
    ]);
  });
});
