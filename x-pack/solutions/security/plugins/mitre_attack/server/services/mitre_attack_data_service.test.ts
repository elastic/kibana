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
import { MitreAttackDataService } from './mitre_attack_data_service';

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
    jest.clearAllMocks();
  });

  it('successful population sets isInitialized to true and logs info', async () => {
    const result = await service.populate();

    expect(result).toBe(true);
    expect(service.isInitialized).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('MITRE ATT&CK data populated')
    );
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
      expect.stringContaining('Failed to populate MITRE ATT&CK data')
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

    const firstResult = await service.ensureInitialized();
    expect(firstResult).toBe(false);
    expect(service.isInitialized).toBe(false);

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

    await expect(service.ensureInitialized()).resolves.toBe(false);
    await expect(service.ensureInitialized()).resolves.toBe(false);

    expect(service.isInitialized).toBe(false);
    expect(savedObjectsRepository.bulkCreate).toHaveBeenCalledTimes(2);
  });

  it('attempts all batches when an early batch returns per-object errors', async () => {
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
    expect(result).toBe(false);
    expect(service.isInitialized).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to populate MITRE ATT&CK data')
    );
  });
});
