/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { MitreTactic, MitreTechnique } from '@kbn/security-mitre-attack-common';
import { getMockMitreTactic, getMockMitreTechnique } from '../../mocks/mitre_entities.mock';
import { createMitreAttackDataClient } from './mitre_attack_data_client';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '@kbn/security-mitre-attack-common';
import { mitreAttackDataServiceMock } from '../__mocks__/mitre_attack_data_service';

describe('MitreAttackDataClient.getById', () => {
  let savedObjectsRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let dataService: ReturnType<typeof mitreAttackDataServiceMock.create>;

  beforeEach(() => {
    savedObjectsRepository = savedObjectsRepositoryMock.create();
    logger = loggingSystemMock.createLogger();
    dataService = mitreAttackDataServiceMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildClient = () =>
    createMitreAttackDataClient({ savedObjectsRepository, logger, dataService });

  it('returns correct entity for known technique ID T1003 with full fields', async () => {
    const technique = getMockMitreTechnique();
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'enterprise:15.1:any',
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          references: [],
          score: 0,
          attributes: getMockMitreTactic({ framework_version: '15.1' }),
        },
      ],
      total: 1,
      per_page: 1,
      page: 1,
    });
    savedObjectsRepository.get.mockResolvedValueOnce({
      id: 'mock-id',
      type: MITRE_ATTACK_ENTITY_SO_TYPE,
      references: [],
      attributes: technique,
    });

    const result = await buildClient().getById('T1003');

    expect(result).toEqual(technique);
    expect(result?.description).toBe('Adversaries may attempt to dump credentials.');
    expect((result as MitreTechnique | undefined)?.tactic_ids).toEqual(['TA0006']);
  });

  it('returns correct entity for known tactic ID TA0001 with full fields', async () => {
    const tactic = getMockMitreTactic();
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'enterprise:15.1:any',
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          references: [],
          score: 0,
          attributes: getMockMitreTactic({ framework_version: '15.1' }),
        },
      ],
      total: 1,
      per_page: 1,
      page: 1,
    });
    savedObjectsRepository.get.mockResolvedValueOnce({
      id: 'mock-id',
      type: MITRE_ATTACK_ENTITY_SO_TYPE,
      references: [],
      attributes: tactic,
    });

    const result = await buildClient().getById('TA0001');

    expect(result).toEqual(tactic);
    expect(result?.name).toBe('Initial Access');
    expect((result as MitreTactic | undefined)?.position).toBe(1);
  });

  it('returns undefined for unknown ID, does not throw', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'enterprise:15.1:any',
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          references: [],
          score: 0,
          attributes: getMockMitreTactic({ framework_version: '15.1' }),
        },
      ],
      total: 1,
      per_page: 1,
      page: 1,
    });
    savedObjectsRepository.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(MITRE_ATTACK_ENTITY_SO_TYPE, 'any')
    );

    await expect(buildClient().getById('UNKNOWN-999')).resolves.toBeUndefined();
  });

  it('resolves newest version when frameworkVersion is omitted', async () => {
    const technique = getMockMitreTechnique({ framework_version: '16.0' });
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'enterprise:16.0:any',
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          references: [],
          score: 0,
          attributes: getMockMitreTactic({ framework_version: '16.0' }),
        },
      ],
      total: 1,
      per_page: 1,
      page: 1,
    });
    savedObjectsRepository.get.mockResolvedValueOnce({
      id: 'mock-id',
      type: MITRE_ATTACK_ENTITY_SO_TYPE,
      references: [],
      attributes: technique,
    });

    const result = await buildClient().getById('T1003');

    // One find call for version resolution, one get call for actual lookup
    expect(savedObjectsRepository.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepository.get).toHaveBeenCalledTimes(1);
    const versionFindArgs = savedObjectsRepository.find.mock.calls[0][0];
    expect(versionFindArgs.sortField).toBe('framework_version');
    expect(versionFindArgs.sortOrder).toBe('desc');
    expect(versionFindArgs.perPage).toBe(1);
    expect(result?.framework_version).toBe('16.0');
  });

  it('uses provided frameworkVersion without issuing a resolution query', async () => {
    const technique = getMockMitreTechnique({ framework_version: '14.0' });
    savedObjectsRepository.get.mockResolvedValueOnce({
      id: 'mock-id',
      type: MITRE_ATTACK_ENTITY_SO_TYPE,
      references: [],
      attributes: technique,
    });

    const result = await buildClient().getById('T1003', {
      framework: 'enterprise',
      frameworkVersion: '14.0',
    });

    // Only one get call — no resolution needed
    expect(savedObjectsRepository.find).not.toHaveBeenCalled();
    expect(savedObjectsRepository.get).toHaveBeenCalledTimes(1);
    expect(result?.framework_version).toBe('14.0');
  });

  it('returns undefined when index is empty', async () => {
    savedObjectsRepository.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(MITRE_ATTACK_ENTITY_SO_TYPE, 'any')
    );

    await expect(
      buildClient().getById('T1003', { frameworkVersion: '15.1' })
    ).resolves.toBeUndefined();
  });

  it('returns undefined when get throws a not-found error', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'enterprise:15.1:any',
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          references: [],
          score: 0,
          attributes: getMockMitreTactic({ framework_version: '15.1' }),
        },
      ],
      total: 1,
      per_page: 1,
      page: 1,
    });
    savedObjectsRepository.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(MITRE_ATTACK_ENTITY_SO_TYPE, 'any')
    );

    await expect(buildClient().getById('T1003')).resolves.toBeUndefined();
  });

  it('rethrows non-not-found errors from get', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'enterprise:15.1:any',
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          references: [],
          score: 0,
          attributes: getMockMitreTactic({ framework_version: '15.1' }),
        },
      ],
      total: 1,
      per_page: 1,
      page: 1,
    });
    const internalError = new Error('ES cluster unavailable');
    savedObjectsRepository.get.mockRejectedValueOnce(internalError);

    await expect(buildClient().getById('T1003')).rejects.toThrow('ES cluster unavailable');
  });

  it('returns undefined when version resolution finds no documents', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
    });

    await expect(buildClient().getById('T1003')).resolves.toBeUndefined();
    expect(savedObjectsRepository.get).not.toHaveBeenCalled();
  });

  it('returns undefined and issues no repository call when ensureInitialized() resolves false', async () => {
    dataService.ensureInitialized.mockResolvedValueOnce(false);

    const result = await buildClient().getById('T1003');

    expect(result).toBeUndefined();
    expect(savedObjectsRepository.find).not.toHaveBeenCalled();
    expect(savedObjectsRepository.get).not.toHaveBeenCalled();
  });
});
