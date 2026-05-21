/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexCategoryMap } from './get_index_category_map';
import type { CategoriesResponse } from './types';

describe('getIndexCategoryMap', () => {
  it('returns an empty map when categoriesData is undefined', () => {
    const result = getIndexCategoryMap(undefined);
    expect(result.size).toBe(0);
  });

  it('returns an empty map when mainCategoriesMap is empty', () => {
    const data: CategoriesResponse = { rawCategoriesMap: [], mainCategoriesMap: [] };
    expect(getIndexCategoryMap(data).size).toBe(0);
  });

  it('maps each index to its category', () => {
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

    const map = getIndexCategoryMap(data);

    expect(map.get('logs-endpoint.events-000001')).toBe('Endpoint');
    expect(map.get('logs-endpoint.alerts-000001')).toBe('Endpoint');
    expect(map.get('logs-network.traffic-000001')).toBe('Network');
    expect(map.size).toBe(3);
  });

  it('last-write wins when an index appears in multiple categories', () => {
    const data: CategoriesResponse = {
      rawCategoriesMap: [],
      mainCategoriesMap: [
        { category: 'Endpoint', indices: [{ indexName: 'shared-index', docs: 10 }] },
        { category: 'Cloud', indices: [{ indexName: 'shared-index', docs: 10 }] },
      ],
    };

    const map = getIndexCategoryMap(data);
    expect(map.has('shared-index')).toBe(true);
    expect(map.size).toBe(1);
  });
});
