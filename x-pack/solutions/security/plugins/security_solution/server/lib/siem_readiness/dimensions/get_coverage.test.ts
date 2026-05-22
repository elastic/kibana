/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { CategoriesResponse } from '@kbn/siem-readiness';
import { getCoverage } from './get_coverage';
import { fetchCategories } from '../fetchers';

jest.mock('../fetchers', () => ({ fetchCategories: jest.fn() }));

const mockFetchCategories = fetchCategories as jest.Mock;

const esClient = {} as ElasticsearchClient;
const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() } as unknown as Logger;

const makeSavedObjectsClient = (total: number): SavedObjectsClientContract =>
  ({
    find: jest.fn().mockResolvedValue({ total }),
  } as unknown as SavedObjectsClientContract);

const makeCategories = (
  categories: Array<{ category: string; docs: number }>
): CategoriesResponse => ({
  rawCategoriesMap: [],
  mainCategoriesMap: categories.map(({ category, docs }) => ({
    category,
    indices: [{ indexName: `logs-${category.toLowerCase()}-default`, docs }],
  })),
});

describe('getCoverage', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('status', () => {
    it('returns noData when no categories and no detection rules', async () => {
      mockFetchCategories.mockResolvedValueOnce({ rawCategoriesMap: [], mainCategoriesMap: [] });
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(0),
        logger,
      });
      expect(result.status).toBe('noData');
    });

    it('returns actionsRequired when data is ingested but no detection rules are enabled', async () => {
      mockFetchCategories.mockResolvedValueOnce(
        makeCategories([{ category: 'Endpoint', docs: 1000 }])
      );
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(0),
        logger,
      });
      expect(result.status).toBe('actionsRequired');
    });

    it('returns actionsRequired when detection rules exist but a category has no data', async () => {
      mockFetchCategories.mockResolvedValueOnce(
        makeCategories([
          { category: 'Endpoint', docs: 1000 },
          { category: 'Identity', docs: 0 },
        ])
      );
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(5),
        logger,
      });
      expect(result.status).toBe('actionsRequired');
    });

    it('returns healthy when data and detection rules are both present and all categories have data', async () => {
      const fullCategories = makeCategories([
        { category: 'Endpoint', docs: 1000 },
        { category: 'Identity', docs: 500 },
        { category: 'Network', docs: 800 },
        { category: 'Cloud', docs: 300 },
        { category: 'Application/SaaS', docs: 200 },
      ]);
      mockFetchCategories.mockResolvedValueOnce(fullCategories);
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(10),
        logger,
      });
      expect(result.status).toBe('healthy');
    });
  });

  describe('actionableFindings', () => {
    it('emits a finding when no detection rules are enabled', async () => {
      mockFetchCategories.mockResolvedValueOnce(
        makeCategories([{ category: 'Endpoint', docs: 500 }])
      );
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(0),
        logger,
      });
      const resourceNames = result.actionableFindings.map((f) => f.resource);
      expect(resourceNames).toContain('detection_rules');
    });

    it('emits one finding per category with zero docs', async () => {
      mockFetchCategories.mockResolvedValueOnce(
        makeCategories([
          { category: 'Endpoint', docs: 0 },
          { category: 'Identity', docs: 0 },
          { category: 'Network', docs: 300 },
        ])
      );
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(5),
        logger,
      });
      const emptyFindings = result.actionableFindings.filter(
        (f) => f.resource !== 'detection_rules'
      );
      // Endpoint=0, Identity=0 (explicit), Cloud and Application/SaaS absent from data → also 0 docs
      expect(emptyFindings).toHaveLength(4);
    });

    it('emits no category findings when all categories in CATEGORY_ORDER have data', async () => {
      mockFetchCategories.mockResolvedValueOnce(
        makeCategories([
          { category: 'Endpoint', docs: 1000 },
          { category: 'Identity', docs: 500 },
          { category: 'Network', docs: 800 },
          { category: 'Cloud', docs: 300 },
          { category: 'Application/SaaS', docs: 200 },
        ])
      );
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(5),
        logger,
      });
      const categoryFindings = result.actionableFindings.filter(
        (f) => f.resource !== 'detection_rules'
      );
      expect(categoryFindings).toHaveLength(0);
    });
  });

  describe('items', () => {
    it('returns mainCategoriesMap as items', async () => {
      const cats = makeCategories([
        { category: 'Endpoint', docs: 1000 },
        { category: 'Cloud', docs: 200 },
      ]);
      mockFetchCategories.mockResolvedValueOnce(cats);
      const result = await getCoverage({
        esClient,
        savedObjectsClient: makeSavedObjectsClient(5),
        logger,
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].category).toBe('Endpoint');
    });
  });
});
