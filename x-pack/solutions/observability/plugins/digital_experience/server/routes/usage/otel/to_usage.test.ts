/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    selectors: { buckets: [] },
  }
): UsageAggregations => {
  return {
    inEnvironment: {
      pageLoads: {
        doc_count: 0,
        topPages: { buckets: [] },
        browsers: { buckets: [] },
        operatingSystems: { buckets: [] },
        devices: { buckets: [] },
        ...pageLoads,
      },
      clicks,
    },
  };
};

const EMPTY = {
  topPages: [],
  breakdowns: { browsers: [], operatingSystems: [], devices: [] },
  topClicks: [],
};

describe('toUsage', () => {
  it('maps missing aggregations to empty lists', () => {
    expect(toUsage(undefined)).toEqual(EMPTY);
    expect(toUsage(logs())).toEqual(EMPTY);
  });

  it('maps the top pages with their p75 load time, null without a timed load', () => {
    const usage = toUsage(
      logs({
        topPages: {
          buckets: [
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
          ],
        },
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

  it('maps the breakdowns, devices from the boolean terms keys', () => {
    const usage = toUsage(
      logs({
        browsers: {
          buckets: [
            { key: 'Chrome', doc_count: 3 },
            { key: 'Safari', doc_count: 2 },
          ],
        },
        operatingSystems: { buckets: [{ key: 'macOS', doc_count: 5 }] },
        devices: {
          buckets: [
            { key: 0, key_as_string: 'false', doc_count: 3 },
            { key: 1, key_as_string: 'true', doc_count: 2 },
          ],
        },
      })
    );

    expect(usage.breakdowns).toEqual({
      browsers: [
        { name: 'Chrome', pageLoads: 3 },
        { name: 'Safari', pageLoads: 2 },
      ],
      operatingSystems: [{ name: 'macOS', pageLoads: 5 }],
      devices: [
        { name: 'desktop', pageLoads: 3 },
        { name: 'mobile', pageLoads: 2 },
      ],
    });
  });

  it('maps the clicks with their tag name', () => {
    const usage = toUsage(
      logs(
        {},
        {
          doc_count: 3,
          selectors: {
            buckets: [
              { key: '#add-to-cart', doc_count: 2, tagName: { buckets: [{ key: 'BUTTON' }] } },
              { key: '.card', doc_count: 1, tagName: { buckets: [] } },
            ],
          },
        }
      )
    );

    expect(usage.topClicks).toEqual([
      { cssSelector: '#add-to-cart', tagName: 'BUTTON', count: 2 },
      { cssSelector: '.card', tagName: null, count: 1 },
    ]);
  });
});
