/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import { getMockMitreTactic } from '../mocks/mitre_entities.mock';
import type { SavedObjectsBulkResponse } from '@kbn/core/server';
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import { MitreAttackDataService, POPULATION_RETRY_COOLDOWN_MS } from './mitre_attack_data_service';

jest.mock('@kbn/security-mitre-attack-server', () => ({
  loadMitreArtifact: jest.fn(),
}));

const mockLoadMitreArtifact = jest.mocked(loadMitreArtifact);

describe('MitreAttackDataService', () => {
  let service: MitreAttackDataService;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let savedObjectsRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    savedObjectsRepository = savedObjectsRepositoryMock.create();
    service = new MitreAttackDataService(logger);
    service.initialize(savedObjectsRepository);

    mockLoadMitreArtifact.mockReturnValue([getMockMitreTactic()]);
    savedObjectsRepository.bulkCreate.mockResolvedValue({
      saved_objects: [
        {
          id: 'enterprise:15.1:TA0001',
          type: 'mitre-attack-entity',
          attributes: getMockMitreTactic(),
          references: [],
          version: '1',
        },
      ],
    } as SavedObjectsBulkResponse<MitreEntity>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('successful population sets isInitialized to true and logs info', async () => {
    const result = await service.populate();

    expect(result).toBe(true);
    expect(service.isInitialized).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('MITRE data populated'));
  });

  it('population failure is caught, logged, and isInitialized stays false', async () => {
    savedObjectsRepository.bulkCreate.mockResolvedValue({
      saved_objects: [
        {
          id: 'enterprise:15.1:TA0001',
          type: 'mitre-attack-entity',
          error: { statusCode: 500, error: 'Internal Server Error', message: 'ES write error' },
        },
      ],
    } as SavedObjectsBulkResponse<MitreEntity>);

    const result = await service.populate();

    expect(result).toBe(false);
    expect(service.isInitialized).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to populate MITRE data')
    );
  });

  it('bulkCreate is called with overwrite: true and deterministic IDs', async () => {
    const entity = getMockMitreTactic();
    mockLoadMitreArtifact.mockReturnValue([entity]);

    await service.populate();

    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'enterprise:15.1:TA0001',
          type: 'mitre-attack-entity',
          attributes: entity,
        }),
      ]),
      { overwrite: true }
    );
  });

  it('concurrent populate() calls while in flight do not trigger a second bulkCreate', async () => {
    let resolveBulkCreate!: (value: SavedObjectsBulkResponse<MitreEntity>) => void;
    const deferred = new Promise<SavedObjectsBulkResponse<MitreEntity>>((resolve) => {
      resolveBulkCreate = resolve;
    });
    savedObjectsRepository.bulkCreate.mockReturnValue(deferred);

    const p1 = service.populate();
    const p2 = service.populate();

    // Both callers must receive the same promise object
    expect(p1).toBe(p2);

    resolveBulkCreate({
      saved_objects: [
        {
          id: 'enterprise:15.1:TA0001',
          type: 'mitre-attack-entity',
          attributes: getMockMitreTactic(),
          references: [],
          version: '1',
        },
      ],
    } as SavedObjectsBulkResponse<MitreEntity>);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('ensureInitialized() after a failed run retries and returns true on second attempt', async () => {
    savedObjectsRepository.bulkCreate
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'enterprise:15.1:TA0001',
            type: 'mitre-attack-entity',
            error: { statusCode: 500, error: 'Internal Server Error', message: 'ES write error' },
          },
        ],
      } as SavedObjectsBulkResponse<MitreEntity>)
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'enterprise:15.1:TA0001',
            type: 'mitre-attack-entity',
            attributes: getMockMitreTactic(),
            references: [],
            version: '1',
          },
        ],
      } as SavedObjectsBulkResponse<MitreEntity>);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const firstResult = await service.ensureInitialized();
    expect(firstResult).toBe(false);
    expect(service.isInitialized).toBe(false);

    nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS);
    const secondResult = await service.ensureInitialized();
    expect(secondResult).toBe(true);
    expect(service.isInitialized).toBe(true);
    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
  });

  it('ensureInitialized() returns false on repeated failure without rejecting', async () => {
    savedObjectsRepository.bulkCreate.mockResolvedValue({
      saved_objects: [
        {
          id: 'enterprise:15.1:TA0001',
          type: 'mitre-attack-entity',
          error: { statusCode: 500, error: 'Internal Server Error', message: 'ES write error' },
        },
      ],
    } as SavedObjectsBulkResponse<MitreEntity>);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await expect(service.ensureInitialized()).resolves.toBe(false);
    nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS);
    await expect(service.ensureInitialized()).resolves.toBe(false);

    expect(service.isInitialized).toBe(false);
    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
  });

  it('attempts all batches and stays usable when only some objects fail', async () => {
    // 501 entities → 2 batches (500 + 1)
    const entities = Array.from({ length: 501 }, (_, i) =>
      getMockMitreTactic({ id: `TA${String(i).padStart(4, '0')}` })
    );
    mockLoadMitreArtifact.mockReturnValue(entities);

    // Batch 1 returns a per-object error; batch 2 succeeds
    savedObjectsRepository.bulkCreate
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'enterprise:15.1:TA0000',
            type: 'mitre-attack-entity',
            error: { statusCode: 500, error: 'Internal Server Error', message: 'ES write error' },
          },
        ],
      } as SavedObjectsBulkResponse<MitreEntity>)
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'enterprise:15.1:TA0500',
            type: 'mitre-attack-entity',
            attributes: entities[500],
            references: [],
            version: '1',
          },
        ],
      } as SavedObjectsBulkResponse<MitreEntity>);

    const result = await service.populate();

    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
    expect(result).toBe(true);
    expect(service.isInitialized).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('MITRE data partially populated: 1 error(s) out of 501 entities')
    );

    await expect(service.populate()).resolves.toBe(true);
    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
  });

  it('a degraded service serves immediately and self-heals after the cooldown', async () => {
    const entities = [getMockMitreTactic({ id: 'TA0001' }), getMockMitreTactic({ id: 'TA0002' })];
    mockLoadMitreArtifact.mockReturnValue(entities);
    const toResponse = (failedId?: string) =>
      ({
        saved_objects: entities.map((entity) =>
          entity.id === failedId
            ? {
                id: `enterprise:15.1:${entity.id}`,
                type: 'mitre-attack-entity',
                error: { statusCode: 500, error: 'Internal Server Error', message: 'ES error' },
              }
            : {
                id: `enterprise:15.1:${entity.id}`,
                type: 'mitre-attack-entity',
                attributes: entity,
                references: [],
                version: '1',
              }
        ),
      } as SavedObjectsBulkResponse<MitreEntity>);
    savedObjectsRepository.bulkCreate
      .mockResolvedValueOnce(toResponse('TA0002'))
      .mockResolvedValueOnce(toResponse());

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await expect(service.ensureInitialized()).resolves.toBe(true);
    expect(service.isInitialized).toBe(true);

    nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS);
    await expect(service.ensureInitialized()).resolves.toBe(true);
    await service.populate(); // joins the background repair run
    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
    expect(service.isInitialized).toBe(true);

    await service.ensureInitialized();
    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
  });

  describe('a degraded service with a repair run', () => {
    const entities = [getMockMitreTactic({ id: 'TA0001' }), getMockMitreTactic({ id: 'TA0002' })];
    const toResponse = (failedIds: string[]) =>
      ({
        saved_objects: entities.map((entity) =>
          failedIds.includes(entity.id)
            ? {
                id: `enterprise:15.1:${entity.id}`,
                type: 'mitre-attack-entity',
                error: { statusCode: 500, error: 'Internal Server Error', message: 'ES error' },
              }
            : {
                id: `enterprise:15.1:${entity.id}`,
                type: 'mitre-attack-entity',
                attributes: entity,
                references: [],
                version: '1',
              }
        ),
      } as SavedObjectsBulkResponse<MitreEntity>);

    beforeEach(() => {
      mockLoadMitreArtifact.mockReturnValue(entities);
    });

    it('keeps serving when the repair fails for every entity', async () => {
      savedObjectsRepository.bulkCreate
        .mockResolvedValueOnce(toResponse(['TA0002']))
        .mockResolvedValueOnce(toResponse(['TA0001', 'TA0002']));

      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      await expect(service.ensureInitialized()).resolves.toBe(true);

      nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS);
      await expect(service.ensureInitialized()).resolves.toBe(true);
      await service.populate(); // joins the repair run

      expect(service.isInitialized).toBe(true);
      await expect(service.ensureInitialized()).resolves.toBe(true);
    });

    it('keeps serving when the repair write rejects', async () => {
      savedObjectsRepository.bulkCreate
        .mockResolvedValueOnce(toResponse(['TA0002']))
        .mockRejectedValueOnce(new Error('ES unavailable'));

      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      await expect(service.ensureInitialized()).resolves.toBe(true);

      nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS);
      await expect(service.ensureInitialized()).resolves.toBe(true);
      await service.populate(); // joins the repair run

      expect(service.isInitialized).toBe(true);
      await expect(service.ensureInitialized()).resolves.toBe(true);
    });

    it('serves without waiting while the repair is in flight', async () => {
      let resolveRepair!: (value: SavedObjectsBulkResponse<MitreEntity>) => void;
      savedObjectsRepository.bulkCreate
        .mockResolvedValueOnce(toResponse(['TA0002']))
        .mockReturnValueOnce(
          new Promise<SavedObjectsBulkResponse<MitreEntity>>((resolve) => {
            resolveRepair = resolve;
          })
        );

      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      await expect(service.ensureInitialized()).resolves.toBe(true);

      nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS);
      await expect(service.ensureInitialized()).resolves.toBe(true);
      await expect(service.ensureInitialized()).resolves.toBe(true); // repair still pending
      expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);

      resolveRepair(toResponse([]));
      await service.populate();
      expect(service.isInitialized).toBe(true);
    });
  });

  it('a failure of every entity sets the state to failed', async () => {
    const entities = [getMockMitreTactic({ id: 'TA0001' }), getMockMitreTactic({ id: 'TA0002' })];
    mockLoadMitreArtifact.mockReturnValue(entities);
    savedObjectsRepository.bulkCreate.mockResolvedValue({
      saved_objects: entities.map(({ id }) => ({
        id: `enterprise:15.1:${id}`,
        type: 'mitre-attack-entity',
        error: { statusCode: 500, error: 'Internal Server Error', message: 'ES write error' },
      })),
    } as SavedObjectsBulkResponse<MitreEntity>);

    await expect(service.populate()).resolves.toBe(false);

    expect(service.isInitialized).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to populate MITRE data: 2 error(s) out of 2 entities')
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  describe('retry cooldown', () => {
    const failedResponse = {
      saved_objects: [
        {
          id: 'enterprise:15.1:TA0001',
          type: 'mitre-attack-entity',
          error: { statusCode: 500, error: 'Internal Server Error', message: 'ES write error' },
        },
      ],
    } as SavedObjectsBulkResponse<MitreEntity>;

    it('skips a retry within the cooldown and allows it afterwards', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      savedObjectsRepository.bulkCreate.mockResolvedValueOnce(failedResponse);

      await expect(service.populate()).resolves.toBe(false);
      expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(1);

      nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS - 1);
      await expect(service.populate()).resolves.toBe(false);
      expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping MITRE data population retry')
      );

      nowSpy.mockReturnValue(1_000_000 + POPULATION_RETRY_COOLDOWN_MS);
      await expect(service.populate()).resolves.toBe(true);
      expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
      expect(service.isInitialized).toBe(true);
    });

    it('populate() without initialize() resolves false and is failed, not stuck initializing', async () => {
      const uninitializedService = new MitreAttackDataService(logger);

      await expect(uninitializedService.populate()).resolves.toBe(false);
      expect(uninitializedService.isInitialized).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('SavedObjects repository not initialized')
      );

      await expect(uninitializedService.populate()).resolves.toBe(false);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping MITRE data population retry')
      );
    });
  });
});
