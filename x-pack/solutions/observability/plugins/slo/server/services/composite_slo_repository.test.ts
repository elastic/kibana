/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { escapeKuery } from '@kbn/es-query';
import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';
import { storedCompositeSloDefinitionSchema } from '@kbn/slo-schema';
import { SLOIdConflict, SLONotFound } from '../errors';
import { SO_SLO_COMPOSITE_TYPE } from '../saved_objects';
import { DefaultCompositeSLORepository } from './composite_slo_repository';
import { createCompositeSlo } from './fixtures/composite_slo';

describe('DefaultCompositeSLORepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let logger: jest.Mocked<Logger>;
  let repository: DefaultCompositeSLORepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    repository = new DefaultCompositeSLORepository(soClient, logger);
  });

  describe('create', () => {
    it('creates a composite SLO saved object', async () => {
      const compositeSlo = createCompositeSlo();
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

      const result = await repository.create(compositeSlo);

      expect(result).toEqual(compositeSlo);
      expect(soClient.create).toHaveBeenCalledWith(
        SO_SLO_COMPOSITE_TYPE,
        storedCompositeSloDefinitionSchema.encode(compositeSlo)
      );
    });

    it('throws SLOIdConflict when a composite SLO with the same id exists', async () => {
      const compositeSlo = createCompositeSlo();
      const stored = storedCompositeSloDefinitionSchema.encode(compositeSlo);
      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-id-1', attributes: stored }],
        page: 1,
        per_page: 1,
      } as any);

      await expect(repository.create(compositeSlo)).rejects.toThrow(SLOIdConflict);
    });
  });

  describe('update', () => {
    it('updates an existing composite SLO saved object', async () => {
      const compositeSlo = createCompositeSlo();
      const stored = storedCompositeSloDefinitionSchema.encode(compositeSlo);
      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-id-1', attributes: stored }],
        page: 1,
        per_page: 1,
      } as any);

      const result = await repository.update(compositeSlo);

      expect(result).toEqual(compositeSlo);
      expect(soClient.create).toHaveBeenCalledWith(
        SO_SLO_COMPOSITE_TYPE,
        storedCompositeSloDefinitionSchema.encode(compositeSlo),
        { id: 'so-id-1', overwrite: true }
      );
    });

    it('throws SLONotFound when the composite SLO does not exist', async () => {
      const compositeSlo = createCompositeSlo();
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

      await expect(repository.update(compositeSlo)).rejects.toThrow(SLONotFound);
    });
  });

  describe('findById', () => {
    it('returns the composite SLO matching the id', async () => {
      const compositeSlo = createCompositeSlo();
      const stored = storedCompositeSloDefinitionSchema.encode(compositeSlo);
      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-id-1', attributes: stored }],
        page: 1,
        per_page: 1,
      } as any);

      const result = await repository.findById(compositeSlo.id);

      expect(result.id).toEqual(compositeSlo.id);
      expect(result.name).toEqual(compositeSlo.name);
      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SO_SLO_COMPOSITE_TYPE,
          filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.id:(${escapeKuery(compositeSlo.id)})`,
        })
      );
    });

    it('throws SLONotFound when the composite SLO does not exist', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

      await expect(repository.findById('non-existent-id')).rejects.toThrow(SLONotFound);
    });
  });

  describe('deleteById', () => {
    it('deletes the composite SLO matching the id', async () => {
      const compositeSlo = createCompositeSlo();
      const stored = storedCompositeSloDefinitionSchema.encode(compositeSlo);
      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-id-1', attributes: stored }],
        page: 1,
        per_page: 1,
      } as any);

      await repository.deleteById(compositeSlo.id);

      expect(soClient.delete).toHaveBeenCalledWith(SO_SLO_COMPOSITE_TYPE, 'so-id-1');
    });

    it('throws SLONotFound when the composite SLO does not exist', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 1,
      } as any);

      await expect(repository.deleteById('non-existent-id')).rejects.toThrow(SLONotFound);
    });
  });

  describe('search', () => {
    it('returns paginated results with default sort', async () => {
      const compositeSlo = createCompositeSlo();
      const stored = storedCompositeSloDefinitionSchema.encode(compositeSlo);
      soClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'so-id-1', attributes: stored }],
        page: 1,
        per_page: 25,
      } as any);

      const result = await repository.search({
        pagination: { page: 1, perPage: 25 },
      });

      expect(result.total).toEqual(1);
      expect(result.page).toEqual(1);
      expect(result.perPage).toEqual(25);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toEqual(compositeSlo.id);
      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('passes search term when provided', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 25,
      } as any);

      await repository.search({
        pagination: { page: 1, perPage: 25 },
        search: 'my composite',
      });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'my composite',
          searchFields: ['name'],
        })
      );
    });

    it('filters by tags when provided', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 25,
      } as any);

      await repository.search({
        pagination: { page: 1, perPage: 25 },
        tags: ['critical', 'production'],
      });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.tags: (${escapeKuery(
            'critical'
          )} OR ${escapeKuery('production')})`,
        })
      );
    });

    it('uses custom sortBy and sortDirection', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 25,
      } as any);

      await repository.search({
        pagination: { page: 1, perPage: 25 },
        sortBy: 'updatedAt',
        sortDirection: 'asc',
      });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'updatedAt',
          sortOrder: 'asc',
        })
      );
    });

    it('maps name sortBy to name.keyword for Elasticsearch', async () => {
      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        page: 1,
        per_page: 25,
      } as any);

      await repository.search({
        pagination: { page: 1, perPage: 25 },
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(soClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'name.keyword',
          sortOrder: 'asc',
        })
      );
    });

    it('filters out invalid stored composite SLOs', async () => {
      const compositeSlo = createCompositeSlo();
      const stored = storedCompositeSloDefinitionSchema.encode(compositeSlo);
      soClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          { id: 'so-id-1', attributes: stored },
          { id: 'so-id-2', attributes: { invalid: 'data' } },
        ],
        page: 1,
        per_page: 25,
      } as any);

      const result = await repository.search({
        pagination: { page: 1, perPage: 25 },
      });

      expect(result.total).toEqual(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toEqual(compositeSlo.id);
    });
  });
});
