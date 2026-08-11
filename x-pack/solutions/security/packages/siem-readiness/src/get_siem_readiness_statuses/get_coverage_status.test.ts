/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse } from '../types';
import { getCoverageStatus } from './get_coverage_status';

const makeCategoriesResponse = (
  categories: Array<{ category: string; docs: number }>
): CategoriesResponse => ({
  rawCategoriesMap: [],
  mainCategoriesMap: categories.map(({ category, docs }) => ({
    category,
    indices: [{ indexName: `logs-${category.toLowerCase()}-default`, docs }],
  })),
});

describe('getCoverageStatus', () => {
  describe('noData', () => {
    it('returns noData when no categories and no detection rules', () => {
      expect(getCoverageStatus(undefined, false, undefined)).toBe('noData');
    });

    it('returns noData when empty mainCategoriesMap and no detection rules', () => {
      const empty: CategoriesResponse = { rawCategoriesMap: [], mainCategoriesMap: [] };
      expect(getCoverageStatus(empty, false, undefined)).toBe('noData');
    });
  });

  describe('actionsRequired', () => {
    it('returns actionsRequired when categories exist but no detection rules', () => {
      const cats = makeCategoriesResponse([{ category: 'Endpoint', docs: 1000 }]);
      expect(getCoverageStatus(cats, false, undefined)).toBe('actionsRequired');
    });

    it('returns actionsRequired when detection rules present but a category has zero docs', () => {
      const cats = makeCategoriesResponse([
        { category: 'Endpoint', docs: 1000 },
        { category: 'Identity', docs: 0 },
      ]);
      expect(getCoverageStatus(cats, true, undefined)).toBe('actionsRequired');
    });

    it('returns actionsRequired when integration gaps are present', () => {
      const cats = makeCategoriesResponse([{ category: 'Endpoint', docs: 1000 }]);
      expect(getCoverageStatus(cats, true, { missingIntegrations: ['splunk'] })).toBe(
        'actionsRequired'
      );
    });
  });

  describe('healthy', () => {
    it('returns healthy when detection rules exist, all CATEGORY_ORDER entries have docs, and no integration gaps', () => {
      const cats = makeCategoriesResponse([
        { category: 'Endpoint', docs: 1000 },
        { category: 'Identity', docs: 500 },
        { category: 'Network', docs: 800 },
        { category: 'Cloud', docs: 300 },
        { category: 'Application/SaaS', docs: 200 },
      ]);
      expect(getCoverageStatus(cats, true, { missingIntegrations: [] })).toBe('healthy');
    });

    it('returns healthy when ruleIntegrationCoverage is undefined but rules and all category data exist', () => {
      const cats = makeCategoriesResponse([
        { category: 'Endpoint', docs: 1000 },
        { category: 'Identity', docs: 500 },
        { category: 'Network', docs: 800 },
        { category: 'Cloud', docs: 300 },
        { category: 'Application/SaaS', docs: 200 },
      ]);
      expect(getCoverageStatus(cats, true, undefined)).toBe('healthy');
    });
  });
});
