/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBuckets, termsAggregate } from '../../../lib/helpers/aggregate_fixtures.test_helpers';
import type { UsageAggregations } from './search_response';
import { toUsage } from './to_usage';

const percentile = (value: number | null) => {
  return {
    values: value === null ? [] : [{ key: 75, value }],
  };
};

const logs = (
  pageLoads: Partial<UsageAggregations['inEnvironment']['pageLoads']> = {},
  clicks: UsageAggregations['inEnvironment']['clicks'] = {
    doc_count: 0,
    selectors: termsAggregate([]),
  }
): UsageAggregations => {
  return {
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
    },
  };
};

const EMPTY = {
  topPages: [],
  breakdowns: { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] },
  topClicks: [],
  totalClicks: 0,
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
      {
        url: 'https://shop/',
        pageLoads: 4,
        loadTimeP75Ms: 1200.5,
      },
      { url: 'https://shop/cart', pageLoads: 1, loadTimeP75Ms: null },
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
});
