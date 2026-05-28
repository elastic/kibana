/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse, DataQualityResultDocument, MainCategories } from '../types';
import { getQualityStatus } from './get_quality_status';

const ENDPOINT_INDEX = 'logs-endpoint.events-default';
const CLOUD_INDEX = 'logs-cloud.asset_inventory-default';

const mockCategories: CategoriesResponse = {
  rawCategoriesMap: [],
  mainCategoriesMap: [
    { category: 'Endpoint', indices: [{ indexName: ENDPOINT_INDEX, docs: 1000 }] },
    { category: 'Cloud', indices: [{ indexName: CLOUD_INDEX, docs: 200 }] },
  ],
};

const makeQualityResult = (
  indexName: string,
  incompatibleFieldCount = 0
): DataQualityResultDocument =>
  ({
    indexName,
    incompatibleFieldCount,
    batchId: 'b1',
    isCheckAll: false,
    checkedAt: Date.now(),
    docsCount: 100,
    totalFieldCount: 50,
    ecsFieldCount: 48,
    customFieldCount: 2,
    sameFamilyFieldCount: 0,
    sameFamilyFields: [],
    sameFamilyFieldItems: [],
    incompatibleFieldMappingItems: [],
    incompatibleFieldValueItems: [],
    unallowedMappingFields: [],
    unallowedValueFields: [],
    sizeInBytes: 1024,
    markdownComments: [],
    ecsVersion: '8.11.0',
    error: null,
  } as const);

const ALL_CATEGORIES: MainCategories[] = [
  'Endpoint',
  'Cloud',
  'Identity',
  'Network',
  'Application/SaaS',
];

describe('getQualityStatus', () => {
  describe('noData', () => {
    it('returns noData when categoriesData is undefined', () => {
      expect(getQualityStatus(undefined, [], ALL_CATEGORIES)).toBe('noData');
    });

    it('returns noData when qualityData is undefined', () => {
      expect(getQualityStatus(mockCategories, undefined, ALL_CATEGORIES)).toBe('noData');
    });

    it('returns noData when activeCategories has no matching entries in the category map', () => {
      const emptyCats: CategoriesResponse = { rawCategoriesMap: [], mainCategoriesMap: [] };
      const results = [makeQualityResult('logs-completely-unrelated-default')];
      expect(getQualityStatus(emptyCats, results, ALL_CATEGORIES)).toBe('noData');
    });
  });

  describe('actionsRequired', () => {
    it('returns actionsRequired when an active-category index has incompatible fields', () => {
      const results = [makeQualityResult(ENDPOINT_INDEX, 3)];
      expect(getQualityStatus(mockCategories, results, ['Endpoint'])).toBe('actionsRequired');
    });

    it('returns actionsRequired even when only one of two indices is incompatible', () => {
      const results = [makeQualityResult(ENDPOINT_INDEX, 3), makeQualityResult(CLOUD_INDEX, 0)];
      expect(getQualityStatus(mockCategories, results, ALL_CATEGORIES)).toBe('actionsRequired');
    });
  });

  describe('healthy', () => {
    it('returns healthy when all active-category indices have 0 incompatible fields', () => {
      const results = [makeQualityResult(ENDPOINT_INDEX, 0), makeQualityResult(CLOUD_INDEX, 0)];
      expect(getQualityStatus(mockCategories, results, ALL_CATEGORIES)).toBe('healthy');
    });
  });

  describe('activeCategories filter', () => {
    it('ignores incompatible fields in a category not in activeCategories', () => {
      const results = [makeQualityResult(CLOUD_INDEX, 5)];
      // Cloud has incompatible fields but we only check Endpoint.
      // Endpoint indices exist in the category map but have no quality results → no incompatibility → healthy.
      expect(getQualityStatus(mockCategories, results, ['Endpoint'])).toBe('healthy');
    });
  });
});
