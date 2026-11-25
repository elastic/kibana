/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOP_ROWS } from '../../../../common/top_rows';
import {
  keyBuckets,
  NO_ENVIRONMENTS,
  termsAggregate,
} from '../../../lib/helpers/aggregate_fixtures.test_helpers';
import type { UsageAggregations } from './search_response';
import { toUsage } from './to_usage';

const percentile = (value: number | null) => {
  return {
    values: value === null ? [] : [{ key: 75, value }],
  };
};

type Aggregations = UsageAggregations['inEnvironment'];

const EMPTY_FRUSTRATION: Aggregations['frustration'] = {
  doc_count: 0,
  byType: termsAggregate([]),
  sessions: { value: 0 },
  elements: termsAggregate([]),
  pages: termsAggregate([]),
};

const byType = (rage = 0, dead = 0, error = 0) => {
  return termsAggregate(
    [
      { key: 'browser.frustration.rage_click', doc_count: rage },
      { key: 'browser.frustration.dead_click', doc_count: dead },
      { key: 'browser.frustration.error_click', doc_count: error },
    ].filter(({ doc_count: count }) => count > 0)
  );
};

const logs = (
  pageLoads: Partial<Aggregations['pageLoads']> = {},
  clicks: Aggregations['clicks'] = {
    doc_count: 0,
    selectors: termsAggregate([]),
  },
  frustration: Partial<Aggregations['frustration']> = {},
  pageSignals: Aggregations['pageSignals'] = { doc_count: 0, pages: termsAggregate([]) }
): UsageAggregations => {
  return {
    ...NO_ENVIRONMENTS,
    inEnvironment: {
      doc_count: 0,
      pageLoads: {
        doc_count: 0,
        topPages: termsAggregate([]),
        browsers: termsAggregate([]),
        operatingSystems: termsAggregate([]),
        devices: termsAggregate([]),
        ...pageLoads,
      },
      clicks,
      frustration: { ...EMPTY_FRUSTRATION, ...frustration },
      pageSignals,
    },
  };
};

const NO_SIGNALS = { lcpP75Ms: null, inpP75Ms: null, clsP75: null, jsErrors: null };

const EMPTY = {
  topPages: [],
  breakdowns: { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] },
  topClicks: [],
  totalClicks: 0,
  frustration: { rageClicks: 0, deadClicks: 0, errorClicks: 0, total: 0, sessions: 0 },
  frustratedElements: [],
  frustratedPages: [],
};

describe('toUsage', () => {
  it('maps missing aggregations to empty lists', () => {
    expect(toUsage(undefined)).toEqual(EMPTY);
    expect(toUsage(logs())).toEqual(EMPTY);
  });

  it('maps the top pages with their p75 load time, null without a timed load', () => {
    const usage = toUsage(
      logs({
        topPages: termsAggregate([
          {
            key: 'https://shop/',
            doc_count: 4,
            loadTime: percentile(1200.5),
          },
          {
            key: 'https://shop/cart',
            doc_count: 1,
            loadTime: percentile(null),
          },
        ]),
      })
    );

    expect(usage.topPages).toEqual([
      { url: 'https://shop/', pageLoads: 4, loadTimeP75Ms: 1200.5, ...NO_SIGNALS },
      { url: 'https://shop/cart', pageLoads: 1, loadTimeP75Ms: null, ...NO_SIGNALS },
    ]);
  });

  it('adds the web vitals and JS errors of each page, by its route, and none to a page without', () => {
    const usage = toUsage(
      logs(
        {
          topPages: termsAggregate([
            { key: '/products/{slug}', doc_count: 4, loadTime: percentile(1200) },
            // A page of an app without routes: its vitals and errors carry no URL to join on.
            { key: 'https://shop/cart', doc_count: 2, loadTime: percentile(900) },
          ]),
        },
        undefined,
        {},
        {
          doc_count: 12,
          pages: termsAggregate([
            {
              key: '/products/{slug}',
              doc_count: 12,
              lcp: { doc_count: 4, value: percentile(2100) },
              inp: { doc_count: 2, value: percentile(180) },
              cls: { doc_count: 4, value: percentile(null) },
              jsErrors: { doc_count: 0 },
            },
          ]),
        }
      )
    );

    expect(usage.topPages).toEqual([
      {
        url: '/products/{slug}',
        pageLoads: 4,
        loadTimeP75Ms: 1200,
        lcpP75Ms: 2100,
        inpP75Ms: 180,
        clsP75: null,
        jsErrors: 0,
      },
      { url: 'https://shop/cart', pageLoads: 2, loadTimeP75Ms: 900, ...NO_SIGNALS },
    ]);
  });

  it('maps the breakdowns with every page load', () => {
    const usage = toUsage(
      logs({
        doc_count: 8,
        browsers: termsAggregate([
          { key: 'Chrome', doc_count: 3 },
          { key: 'Safari', doc_count: 2 },
        ]),
        operatingSystems: termsAggregate([{ key: 'macOS', doc_count: 5 }]),
        devices: termsAggregate([
          { key: 'iPhone', doc_count: 3 },
          { key: 'desktop', doc_count: 2 },
        ]),
      })
    );

    expect(usage.breakdowns).toEqual({
      pageLoads: 8,
      browsers: [
        { name: 'Chrome', pageLoads: 3 },
        { name: 'Safari', pageLoads: 2 },
      ],
      operatingSystems: [{ name: 'macOS', pageLoads: 5 }],
      devices: [
        { name: 'iPhone', pageLoads: 3 },
        { name: 'desktop', pageLoads: 2 },
      ],
    });
  });

  it('maps the clicks with their tag name, with every click', () => {
    const usage = toUsage(
      logs(
        {},
        {
          doc_count: 7,
          selectors: termsAggregate([
            { key: '#add-to-cart', doc_count: 2, tagName: termsAggregate(keyBuckets(['BUTTON'])) },
            { key: '.card', doc_count: 1, tagName: termsAggregate([]) },
          ]),
        }
      )
    );

    expect(usage.topClicks).toEqual([
      { cssSelector: '#add-to-cart', tagName: 'BUTTON', count: 2 },
      { cssSelector: '.card', tagName: null, count: 1 },
    ]);
    expect(usage.totalClicks).toBe(7);
  });

  it('maps the frustration summary by type, with every signal and its sessions', () => {
    const usage = toUsage(
      logs({}, undefined, { doc_count: 9, byType: byType(5, 3, 1), sessions: { value: 4 } })
    );

    expect(usage.frustration).toEqual({
      rageClicks: 5,
      deadClicks: 3,
      errorClicks: 1,
      total: 9,
      sessions: 4,
    });
  });

  it('maps the frustrated elements, with the top page as a path', () => {
    const usage = toUsage(
      logs({}, undefined, {
        elements: termsAggregate([
          {
            key: '#buy',
            doc_count: 6,
            byType: byType(4, 2),
            sessions: { value: 3 },
            tagName: termsAggregate(keyBuckets(['BUTTON'])),
            topPage: termsAggregate(keyBuckets(['https://shop/cart?x=1#top'])),
          },
          {
            key: '.card',
            doc_count: 1,
            byType: byType(0, 0, 1),
            sessions: { value: 1 },
            tagName: termsAggregate([]),
            topPage: termsAggregate([]),
          },
        ]),
      })
    );

    expect(usage.frustratedElements).toEqual([
      {
        cssSelector: '#buy',
        tagName: 'BUTTON',
        rageClicks: 4,
        deadClicks: 2,
        errorClicks: 0,
        total: 6,
        sessions: 3,
        topPage: '/cart',
      },
      {
        cssSelector: '.card',
        tagName: null,
        rageClicks: 0,
        deadClicks: 0,
        errorClicks: 1,
        total: 1,
        sessions: 1,
        topPage: null,
      },
    ]);
  });

  it('folds the frustrated page URLs into paths: counts add up, sessions take the maximum', () => {
    const usage = toUsage(
      logs({}, undefined, {
        pages: termsAggregate([
          {
            key: 'https://shop/cart?a=1',
            doc_count: 4,
            byType: byType(3, 1),
            sessions: { value: 2 },
          },
          { key: 'https://shop/', doc_count: 5, byType: byType(0, 0, 5), sessions: { value: 5 } },
          {
            key: 'https://shop/cart?a=2',
            doc_count: 3,
            byType: byType(1, 0, 2),
            sessions: { value: 3 },
          },
        ]),
      })
    );

    expect(usage.frustratedPages).toEqual([
      {
        page: '/cart',
        rageClicks: 4,
        deadClicks: 1,
        errorClicks: 2,
        total: 7,
        sessions: 3,
      },
      { page: '/', rageClicks: 0, deadClicks: 0, errorClicks: 5, total: 5, sessions: 5 },
    ]);
  });

  it('caps the folded pages at TOP_ROWS, by total', () => {
    const urls = Array.from({ length: TOP_ROWS + 5 }, (_, index) => index);
    const usage = toUsage(
      logs({}, undefined, {
        pages: termsAggregate(
          urls.map((index) => ({
            key: `https://shop/page-${index}`,
            doc_count: index + 1,
            byType: byType(index + 1),
            sessions: { value: 1 },
          }))
        ),
      })
    );

    expect(usage.frustratedPages).toHaveLength(TOP_ROWS);
    expect(usage.frustratedPages[0]).toMatchObject({ page: `/page-${TOP_ROWS + 4}` });
    expect(usage.frustratedPages[TOP_ROWS - 1].total).toBe(6);
  });

  it('skips page buckets without a path', () => {
    const usage = toUsage(
      logs({}, undefined, {
        pages: termsAggregate([
          { key: 'null', doc_count: 2, byType: byType(2), sessions: { value: 1 } },
        ]),
      })
    );

    expect(usage.frustratedPages).toEqual([]);
  });
});
