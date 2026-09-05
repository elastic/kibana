/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexCategoriesMap, pickPrimaryCategory } from './get_index_categories_map';
import type { CategoriesResponse, MainCategories } from './types';

describe('getIndexCategoriesMap', () => {
  it('returns an empty map when categoriesData is undefined', () => {
    expect(getIndexCategoriesMap(undefined).size).toBe(0);
  });

  it('returns an empty map when mainCategoriesMap is empty', () => {
    const data: CategoriesResponse = { rawCategoriesMap: [], mainCategoriesMap: [] };
    expect(getIndexCategoriesMap(data).size).toBe(0);
  });

  it('maps each index to its categories', () => {
    const data: CategoriesResponse = {
      rawCategoriesMap: [],
      mainCategoriesMap: [
        {
          category: 'Endpoint',
          indices: [
            { indexName: 'logs-endpoint.events-000001', docs: 100 },
            { indexName: 'logs-endpoint.alerts-000001', docs: 50 },
          ],
        },
        {
          category: 'Network',
          indices: [{ indexName: 'logs-network.traffic-000001', docs: 200 }],
        },
      ],
    };

    const map = getIndexCategoriesMap(data);

    expect(map.get('logs-endpoint.events-000001')).toEqual(['Endpoint']);
    expect(map.get('logs-endpoint.alerts-000001')).toEqual(['Endpoint']);
    expect(map.get('logs-network.traffic-000001')).toEqual(['Network']);
    expect(map.size).toBe(3);
  });

  it('keeps all categories when an index appears in multiple groups', () => {
    const data: CategoriesResponse = {
      rawCategoriesMap: [],
      mainCategoriesMap: [
        { category: 'Endpoint', indices: [{ indexName: 'shared-index', docs: 10 }] },
        { category: 'Cloud', indices: [{ indexName: 'shared-index', docs: 10 }] },
        { category: 'Network', indices: [{ indexName: 'shared-index', docs: 5 }] },
      ],
    };

    const map = getIndexCategoriesMap(data);
    expect(map.get('shared-index')).toEqual(['Endpoint', 'Cloud', 'Network']);
    expect(map.size).toBe(1);
  });

  it('ignores unknown / uncategorized main-category labels', () => {
    const data: CategoriesResponse = {
      rawCategoriesMap: [],
      mainCategoriesMap: [
        { category: 'UnknownThing', indices: [{ indexName: 'logs-weird', docs: 1 }] },
        { category: 'Endpoint', indices: [{ indexName: 'logs-endpoint', docs: 1 }] },
      ],
    };

    const map = getIndexCategoriesMap(data);
    expect(map.has('logs-weird')).toBe(false);
    expect(map.get('logs-endpoint')).toEqual(['Endpoint']);
  });
});

describe('pickPrimaryCategory', () => {
  it('returns undefined for empty / undefined input', () => {
    expect(pickPrimaryCategory(undefined)).toBeUndefined();
    expect(pickPrimaryCategory([])).toBeUndefined();
  });

  it('returns the single category when only one is present', () => {
    expect(pickPrimaryCategory(['Cloud'])).toBe('Cloud');
  });

  it('prefers CATEGORY_ORDER when multiple categories are present', () => {
    const categories: MainCategories[] = ['Application/SaaS', 'Cloud', 'Endpoint'];
    expect(pickPrimaryCategory(categories)).toBe('Endpoint');
  });
});
