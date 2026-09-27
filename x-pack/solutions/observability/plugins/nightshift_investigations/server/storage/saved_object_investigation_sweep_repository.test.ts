/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsPointInTimeFinder } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { InvestigationStaleWriteError } from './errors';
import { SavedObjectInvestigationSweepRepository } from './saved_object_investigation_sweep_repository';

const TYPE = NIGHTSHIFT_INVESTIGATION_SO_TYPE;

const foundInvestigation = ({ id, namespaces }: { id: string; namespaces?: string[] }) => ({
  id,
  type: TYPE,
  namespaces,
  version: 'WzEsMV0=',
  references: [],
  score: 0,
  attributes: { status: 'running' as const, created_at: '2024-01-01T00:00:00Z' },
});

const findResponse = (savedObjects: Array<ReturnType<typeof foundInvestigation>>) => ({
  saved_objects: savedObjects,
  total: savedObjects.length,
  page: 1,
  per_page: 100,
});

const createFinder = (
  responses: Array<ReturnType<typeof findResponse>>,
  error?: Error
): ISavedObjectsPointInTimeFinder<
  ReturnType<typeof foundInvestigation>['attributes'],
  Record<string, never>
> => ({
  async *find() {
    if (error) {
      throw error;
    }
    for (const response of responses) {
      yield response;
    }
  },
  close: jest.fn().mockResolvedValue(undefined),
});

const createRepository = () => {
  const savedObjects = savedObjectsRepositoryMock.create();
  const logger = loggerMock.create();
  return {
    logger,
    savedObjects,
    repository: new SavedObjectInvestigationSweepRepository({ savedObjects, logger }),
  };
};

describe('SavedObjectInvestigationSweepRepository', () => {
  describe('findAcrossSpaces()', () => {
    it('searches every space and forwards the query', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.find.mockResolvedValue(findResponse([]));

      await repository.findAcrossSpaces({
        statuses: ['pending', 'running'],
        fields: ['status', 'created_at'],
        sortField: 'created_at',
        sortOrder: 'asc',
        page: 2,
        perPage: 50,
      });

      expect(savedObjects.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TYPE,
          namespaces: ['*'],
          fields: ['status', 'created_at'],
          sortField: 'created_at',
          sortOrder: 'asc',
          page: 2,
          perPage: 50,
        })
      );
      const [{ filter }] = savedObjects.find.mock.calls[0];
      expect(filter).toContain('status: "pending"');
      expect(filter).toContain('status: "running"');
    });

    it('reports the space each investigation belongs to', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.find.mockResolvedValue(
        findResponse([
          foundInvestigation({ id: 'inv-1', namespaces: ['team-a'] }),
          foundInvestigation({ id: 'inv-2', namespaces: ['team-b'] }),
        ])
      );

      const { results } = await repository.findAcrossSpaces({
        statuses: ['running'],
        page: 1,
        perPage: 100,
      });

      expect(results).toEqual([
        {
          investigation: expect.objectContaining({ id: 'inv-1', status: 'running' }),
          spaceId: 'team-a',
        },
        {
          investigation: expect.objectContaining({ id: 'inv-2' }),
          spaceId: 'team-b',
        },
      ]);
    });

    it('treats a missing namespace as the default space', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.find.mockResolvedValue(findResponse([foundInvestigation({ id: 'inv-1' })]));

      const { results } = await repository.findAcrossSpaces({
        statuses: ['running'],
        page: 1,
        perPage: 100,
      });

      expect(results).toEqual([
        { investigation: expect.objectContaining({ id: 'inv-1' }), spaceId: 'default' },
      ]);
    });
  });

  describe('updateInSpace()', () => {
    it('writes the patch to the given space at the given version', async () => {
      const { repository, savedObjects } = createRepository();

      await repository.updateInSpace({
        id: 'inv-1',
        spaceId: 'team-a',
        patch: { status: 'cancelled' },
        version: 'v1',
      });

      expect(savedObjects.update).toHaveBeenCalledWith(
        TYPE,
        'inv-1',
        { status: 'cancelled' },
        { namespace: 'team-a', version: 'v1' }
      );
    });

    it('maps a conflict to InvestigationStaleWriteError', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(TYPE, 'inv-1')
      );

      await expect(
        repository.updateInSpace({ id: 'inv-1', spaceId: 'team-a', patch: { status: 'failed' } })
      ).rejects.toBeInstanceOf(InvestigationStaleWriteError);
    });

    it('rethrows anything else', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.update.mockRejectedValue(new Error('elasticsearch unavailable'));

      await expect(
        repository.updateInSpace({ id: 'inv-1', spaceId: 'team-a', patch: { status: 'failed' } })
      ).rejects.toThrow('elasticsearch unavailable');
    });
  });

  describe('deleteAllAcrossSpaces()', () => {
    it('iterates a point-in-time snapshot and bulk deletes each space independently', async () => {
      const { repository, savedObjects, logger } = createRepository();
      const finder = createFinder([
        findResponse([
          foundInvestigation({ id: 'inv-1', namespaces: ['team-a'] }),
          foundInvestigation({ id: 'inv-2', namespaces: ['team-b'] }),
        ]),
        findResponse([foundInvestigation({ id: 'inv-3', namespaces: ['team-a'] })]),
      ]);
      savedObjects.createPointInTimeFinder.mockReturnValue(finder);
      savedObjects.bulkDelete
        .mockResolvedValueOnce({
          statuses: [{ id: 'inv-1', type: TYPE, success: true }],
        })
        .mockResolvedValueOnce({
          statuses: [{ id: 'inv-2', type: TYPE, success: true }],
        })
        .mockResolvedValueOnce({
          statuses: [{ id: 'inv-3', type: TYPE, success: true }],
        });

      await expect(repository.deleteAllAcrossSpaces()).resolves.toEqual({
        deleted: 3,
        failures: [],
      });
      expect(savedObjects.createPointInTimeFinder).toHaveBeenCalledWith({
        type: TYPE,
        namespaces: ['*'],
        perPage: 1000,
        fields: [],
      });
      expect(finder.close).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Deleted 3 investigation(s) across all spaces with 0 failure(s)'
      );
      expect(logger.warn).not.toHaveBeenCalled();
      expect(savedObjects.bulkDelete).toHaveBeenCalledWith([{ type: TYPE, id: 'inv-1' }], {
        namespace: 'team-a',
      });
      expect(savedObjects.bulkDelete).toHaveBeenCalledWith([{ type: TYPE, id: 'inv-2' }], {
        namespace: 'team-b',
      });
    });

    it('limits concurrent deletes across spaces', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.createPointInTimeFinder.mockReturnValue(
        createFinder([
          findResponse(
            Array.from({ length: 11 }, (_, index) =>
              foundInvestigation({ id: `inv-${index}`, namespaces: [`team-${index}`] })
            )
          ),
        ])
      );
      let activeDeletes = 0;
      let maxActiveDeletes = 0;
      const deleteGate = Promise.withResolvers<void>();
      savedObjects.bulkDelete.mockImplementation(async (objects) => {
        activeDeletes++;
        maxActiveDeletes = Math.max(maxActiveDeletes, activeDeletes);
        if (activeDeletes === 10) {
          deleteGate.resolve();
        }
        await deleteGate.promise;
        activeDeletes--;
        return {
          statuses: objects.map(({ id, type }) => ({ id, type, success: true })),
        };
      });

      await repository.deleteAllAcrossSpaces();

      expect(maxActiveDeletes).toBe(10);
    });

    it('continues deleting later pages after a per-object failure', async () => {
      const { repository, savedObjects, logger } = createRepository();
      savedObjects.createPointInTimeFinder.mockReturnValue(
        createFinder([
          findResponse([foundInvestigation({ id: 'inv-1', namespaces: ['team-a'] })]),
          findResponse([foundInvestigation({ id: 'inv-2', namespaces: ['team-b'] })]),
        ])
      );
      const failedStatus = {
        id: 'inv-1',
        type: TYPE,
        success: false,
        error: { statusCode: 500, error: 'Internal Server Error', message: 'delete failed' },
      } as const;
      savedObjects.bulkDelete
        .mockResolvedValueOnce({ statuses: [failedStatus] })
        .mockResolvedValueOnce({ statuses: [{ id: 'inv-2', type: TYPE, success: true }] });

      await expect(repository.deleteAllAcrossSpaces()).resolves.toEqual({
        deleted: 1,
        failures: [{ id: 'inv-1', spaceId: 'team-a', error: 'delete failed' }],
      });
      expect(savedObjects.bulkDelete).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to delete investigation "inv-1" in space "team-a": delete failed'
      );
    });

    it('does not count already-missing investigations as deleted or failed', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.createPointInTimeFinder.mockReturnValue(
        createFinder([findResponse([foundInvestigation({ id: 'inv-1', namespaces: ['team-a'] })])])
      );
      savedObjects.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'inv-1',
            type: TYPE,
            success: false,
            error: { statusCode: 404, error: 'Not Found', message: 'missing' },
          },
        ],
      });

      await expect(repository.deleteAllAcrossSpaces()).resolves.toEqual({
        deleted: 0,
        failures: [],
      });
    });

    it('reports every investigation when a space bulk delete rejects', async () => {
      const { repository, savedObjects } = createRepository();
      savedObjects.createPointInTimeFinder.mockReturnValue(
        createFinder([
          findResponse([
            foundInvestigation({ id: 'inv-1', namespaces: ['team-a'] }),
            foundInvestigation({ id: 'inv-2', namespaces: ['team-a'] }),
          ]),
        ])
      );
      savedObjects.bulkDelete.mockRejectedValueOnce(new Error('index is write blocked'));

      await expect(repository.deleteAllAcrossSpaces()).resolves.toEqual({
        deleted: 0,
        failures: [
          { id: 'inv-1', spaceId: 'team-a', error: 'index is write blocked' },
          { id: 'inv-2', spaceId: 'team-a', error: 'index is write blocked' },
        ],
      });
    });

    it('logs and rethrows an unexpected finder error', async () => {
      const { repository, savedObjects, logger } = createRepository();
      savedObjects.createPointInTimeFinder.mockReturnValue(
        createFinder([], new Error('point in time failed'))
      );

      await expect(repository.deleteAllAcrossSpaces()).rejects.toThrow('point in time failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete investigations across all spaces: point in time failed'
      );
    });
  });
});
