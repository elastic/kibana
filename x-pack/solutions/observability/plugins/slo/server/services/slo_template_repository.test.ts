/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { DefaultSLOTemplateRepository } from './slo_template_repository';

describe('DefaultSLOTemplateRepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let repository: DefaultSLOTemplateRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    repository = new DefaultSLOTemplateRepository(soClient);
  });

  describe('tags', () => {
    it('returns all unique tags from SLO templates', async () => {
      soClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
        aggregations: {
          tagsAggs: {
            buckets: [
              { key: 'production', doc_count: 5 },
              { key: 'latency', doc_count: 3 },
              { key: 'availability', doc_count: 2 },
            ],
          },
        },
      });

      const tags = await repository.tags();

      expect(tags).toEqual(['production', 'latency', 'availability']);
      expect(soClient.find).toHaveBeenCalledWith({
        type: 'slo_template',
        perPage: 0,
        aggs: {
          tagsAggs: {
            terms: {
              field: 'slo_template.attributes.tags',
              size: 10000,
            },
          },
        },
      });
    });

    it('returns an empty array when no templates exist', async () => {
      soClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
        aggregations: {
          tagsAggs: {
            buckets: [],
          },
        },
      });

      const tags = await repository.tags();

      expect(tags).toEqual([]);
    });

    it('returns an empty array when aggregations are undefined', async () => {
      soClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
      });

      const tags = await repository.tags();

      expect(tags).toEqual([]);
    });
  });
});
