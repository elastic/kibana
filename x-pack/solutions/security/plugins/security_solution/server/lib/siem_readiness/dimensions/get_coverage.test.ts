/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CategoriesResponse } from '@kbn/siem-readiness';
import { getCoverage } from './get_coverage';

const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() } as unknown as Logger;

const makeCategories = (
  categories: Array<{ category: string; docs: number }>
): CategoriesResponse => ({
  rawCategoriesMap: [],
  mainCategoriesMap: categories.map(({ category, docs }) => ({
    category,
    indices: [{ indexName: `logs-${category.toLowerCase()}-default`, docs }],
  })),
});

const emptyCategories: CategoriesResponse = { rawCategoriesMap: [], mainCategoriesMap: [] };

describe('getCoverage', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('status', () => {
    it('returns noData when no categories and no detection rules', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: emptyCategories,
        hasDetectionRules: false,
      });
      expect(result.status).toBe('noData');
    });

    it('returns actionsRequired when data is ingested but no detection rules are enabled', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: makeCategories([{ category: 'Endpoint', docs: 1000 }]),
        hasDetectionRules: false,
      });
      expect(result.status).toBe('actionsRequired');
    });

    it('returns actionsRequired when detection rules exist but a category has no data', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: makeCategories([
          { category: 'Endpoint', docs: 1000 },
          { category: 'Identity', docs: 0 },
        ]),
        hasDetectionRules: true,
      });
      expect(result.status).toBe('actionsRequired');
    });

    it('returns healthy when data and detection rules are both present and all categories have data', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: makeCategories([
          { category: 'Endpoint', docs: 1000 },
          { category: 'Identity', docs: 500 },
          { category: 'Network', docs: 800 },
          { category: 'Cloud', docs: 300 },
          { category: 'Application/SaaS', docs: 200 },
        ]),
        hasDetectionRules: true,
      });
      expect(result.status).toBe('healthy');
    });
  });

  describe('actionableFindings', () => {
    it('emits a finding when no detection rules are enabled', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: makeCategories([{ category: 'Endpoint', docs: 500 }]),
        hasDetectionRules: false,
      });
      const resourceNames = result.actionableFindings.map((f) => f.resource);
      expect(resourceNames).toContain('detection_rules');
    });

    it('emits one finding per category with zero docs', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: makeCategories([
          { category: 'Endpoint', docs: 0 },
          { category: 'Identity', docs: 0 },
          { category: 'Network', docs: 300 },
        ]),
        hasDetectionRules: true,
      });
      const emptyFindings = result.actionableFindings.filter(
        (f) => f.resource !== 'detection_rules'
      );
      // Endpoint=0, Identity=0 (explicit), Cloud and Application/SaaS absent from data → also 0 docs
      expect(emptyFindings).toHaveLength(4);
    });

    it('emits no category findings when all categories in CATEGORY_ORDER have data', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: makeCategories([
          { category: 'Endpoint', docs: 1000 },
          { category: 'Identity', docs: 500 },
          { category: 'Network', docs: 800 },
          { category: 'Cloud', docs: 300 },
          { category: 'Application/SaaS', docs: 200 },
        ]),
        hasDetectionRules: true,
      });
      const categoryFindings = result.actionableFindings.filter(
        (f) => f.resource !== 'detection_rules'
      );
      expect(categoryFindings).toHaveLength(0);
    });
  });

  describe('items', () => {
    it('returns mainCategoriesMap as items', async () => {
      const result = await getCoverage({
        logger,
        categoriesData: makeCategories([
          { category: 'Endpoint', docs: 1000 },
          { category: 'Cloud', docs: 200 },
        ]),
        hasDetectionRules: true,
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].category).toBe('Endpoint');
    });
  });
});
