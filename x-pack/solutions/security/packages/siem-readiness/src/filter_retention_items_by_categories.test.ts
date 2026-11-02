/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse, RetentionInfo } from './types';
import { filterRetentionItemsByCategories } from './filter_retention_items_by_categories';

// Retention items carry data stream names; categories carry backing index names.
// The contains-match is: backing_index.includes(data_stream_name).
const CLOUD_DATA_STREAM = 'logs-cloud.stream-default';
const CLOUD_BACKING_INDEX = '.ds-logs-cloud.stream-default-2024.01.01-000001';
const NETWORK_DATA_STREAM = 'logs-network.dns-default';
const NETWORK_BACKING_INDEX = '.ds-logs-network.dns-default-2024.01.01-000001';
const ORPHAN_DATA_STREAM = 'logs-completely-unrelated-default';

const mockCategories: CategoriesResponse = {
  rawCategoriesMap: [],
  mainCategoriesMap: [
    { category: 'Cloud', indices: [{ indexName: CLOUD_BACKING_INDEX, docs: 500 }] },
    { category: 'Network', indices: [{ indexName: NETWORK_BACKING_INDEX, docs: 200 }] },
  ],
};

const makeItem = (indexName: string): RetentionInfo => ({
  indexName,
  isDataStream: true,
  retentionType: 'ilm',
  retentionPeriod: '400d',
  retentionDays: 400,
  policyName: 'policy-1',
  status: 'healthy',
});

describe('filterRetentionItemsByCategories', () => {
  it('returns empty array when categoriesData is undefined', () => {
    expect(filterRetentionItemsByCategories([makeItem(CLOUD_DATA_STREAM)], undefined)).toEqual([]);
  });

  it('returns empty array when mainCategoriesMap is empty', () => {
    const empty: CategoriesResponse = { rawCategoriesMap: [], mainCategoriesMap: [] };
    expect(filterRetentionItemsByCategories([makeItem(CLOUD_DATA_STREAM)], empty)).toEqual([]);
  });

  it('filters out items whose data stream name does not appear in any backing index', () => {
    const result = filterRetentionItemsByCategories([makeItem(ORPHAN_DATA_STREAM)], mockCategories);
    expect(result).toHaveLength(0);
  });

  it('keeps items whose data stream name is a substring of a category backing index', () => {
    const result = filterRetentionItemsByCategories([makeItem(CLOUD_DATA_STREAM)], mockCategories);
    expect(result).toHaveLength(1);
    expect(result[0].indexName).toBe(CLOUD_DATA_STREAM);
  });

  it('keeps items from multiple categories', () => {
    const result = filterRetentionItemsByCategories(
      [makeItem(CLOUD_DATA_STREAM), makeItem(NETWORK_DATA_STREAM)],
      mockCategories
    );
    expect(result).toHaveLength(2);
  });

  it('mixes categorized and orphan items correctly', () => {
    const result = filterRetentionItemsByCategories(
      [makeItem(CLOUD_DATA_STREAM), makeItem(ORPHAN_DATA_STREAM), makeItem(NETWORK_DATA_STREAM)],
      mockCategories
    );
    expect(result.map((i) => i.indexName)).toEqual([CLOUD_DATA_STREAM, NETWORK_DATA_STREAM]);
  });
});
