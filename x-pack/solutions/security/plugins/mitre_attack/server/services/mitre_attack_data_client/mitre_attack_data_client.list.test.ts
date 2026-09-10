/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import {
  getMockMitreTactic,
  getMockMitreTechnique,
  getMockMitreSubtechnique,
} from '../../mocks/mitre_entities.mock';
import { createMitreAttackDataClient } from './mitre_attack_data_client';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../../saved_objects';
import { mitreAttackDataServiceMock } from '../__mocks__/mitre_attack_data_service';

describe('MitreAttackDataClient.list', () => {
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

  it('returns MitreEntityCollection with populated buckets and applies defaults', async () => {
    const tactic = getMockMitreTactic();
    const technique = getMockMitreTechnique();
    const subtechnique = getMockMitreSubtechnique();
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: `${tactic.framework}:${tactic.framework_version}:${tactic.id}`,
            type: MITRE_ATTACK_ENTITY_SO_TYPE,
            references: [],
            score: 1.0,
            attributes: tactic,
          },
          {
            id: `${technique.framework}:${technique.framework_version}:${technique.id}`,
            type: MITRE_ATTACK_ENTITY_SO_TYPE,
            references: [],
            score: 1.0,
            attributes: technique,
          },
          {
            id: `${subtechnique.framework}:${subtechnique.framework_version}:${subtechnique.id}`,
            type: MITRE_ATTACK_ENTITY_SO_TYPE,
            references: [],
            score: 1.0,
            attributes: subtechnique,
          },
        ],
        total: 3,
        per_page: 10000,
        page: 1,
      });

    const result = await buildClient().list();

    expect(result.framework).toBe('enterprise');
    expect(result.frameworkVersion).toBe('15.1');
    expect(result.tactics).toEqual([tactic]);
    expect(result.techniques).toEqual([technique]);
    expect(result.subtechniques).toEqual([subtechnique]);

    // Verify default status filter: active only
    const listFindArgs = savedObjectsRepository.find.mock.calls[1][0];
    expect(listFindArgs.filter).toContain('mitre-attack-entity.attributes.revoked: false');
    expect(listFindArgs.filter).toContain('mitre-attack-entity.attributes.deprecated: false');
  });

  it('filters by tactic type', async () => {
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 10000, page: 1 });

    await buildClient().list({ types: ['tactic'] });

    const listFindArgs = savedObjectsRepository.find.mock.calls[1][0];
    expect(listFindArgs.filter).toContain('mitre-attack-entity.attributes.type: ("tactic")');
  });

  it('filters by technique type', async () => {
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 10000, page: 1 });

    await buildClient().list({ types: ['technique'] });

    const listFindArgs = savedObjectsRepository.find.mock.calls[1][0];
    expect(listFindArgs.filter).toContain('mitre-attack-entity.attributes.type: ("technique")');
  });

  it('filters by subtechnique type', async () => {
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 10000, page: 1 });

    await buildClient().list({ types: ['subtechnique'] });

    const listFindArgs = savedObjectsRepository.find.mock.calls[1][0];
    expect(listFindArgs.filter).toContain('mitre-attack-entity.attributes.type: ("subtechnique")');
  });

  it('excludes revoked and deprecated entities by default', async () => {
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 10000, page: 1 });

    await buildClient().list();

    const listFindArgs = savedObjectsRepository.find.mock.calls[1][0];
    expect(listFindArgs.filter).toContain('mitre-attack-entity.attributes.revoked: false');
    expect(listFindArgs.filter).toContain('mitre-attack-entity.attributes.deprecated: false');
  });

  it("includes revoked and deprecated entities when status is 'all'", async () => {
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 10000, page: 1 });

    await buildClient().list({ status: 'all' });

    const listFindArgs = savedObjectsRepository.find.mock.calls[1][0];
    expect(listFindArgs.filter).not.toContain('revoked');
    expect(listFindArgs.filter).not.toContain('deprecated');
  });

  it('returns empty collection when index is empty, does not throw', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [],
      total: 0,
      per_page: 10000,
      page: 1,
    });

    const result = await buildClient().list({ frameworkVersion: '15.1' });

    await expect(Promise.resolve(result)).resolves.toBeDefined();
    expect(result.tactics).toHaveLength(0);
    expect(result.techniques).toHaveLength(0);
    expect(result.subtechniques).toHaveLength(0);
  });

  it('returns empty collection with frameworkVersion undefined when no docs exist', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [],
      total: 0,
      per_page: 10000,
      page: 1,
    });

    const result = await buildClient().list();

    expect(result.frameworkVersion).toBeUndefined();
    expect(result.tactics).toHaveLength(0);
  });

  it('throws when a stored document fails validation', async () => {
    const badEntity = { id: 'T9999', name: 'Bad', framework: 'enterprise' };
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'mock-bad',
            type: MITRE_ATTACK_ENTITY_SO_TYPE,
            references: [],
            score: 0,
            attributes: badEntity as unknown as MitreEntity,
          },
        ],
        total: 1,
        per_page: 10000,
        page: 1,
      });

    await expect(buildClient().list()).rejects.toThrow(BadRequestError);
  });

  it('calls find with perPage 10000 and all namespaces', async () => {
    savedObjectsRepository.find
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 10000, page: 1 });

    await buildClient().list();

    const listFindArgs = savedObjectsRepository.find.mock.calls[1][0];
    expect(listFindArgs.perPage).toBe(10000);
    expect(listFindArgs.namespaces).toEqual(['*']);
    expect(listFindArgs.type).toBe(MITRE_ATTACK_ENTITY_SO_TYPE);
    expect(listFindArgs.sortField).toBe('id');
    expect(listFindArgs.sortOrder).toBe('asc');
  });

  it('returns the empty collection and issues no repository call when ensureInitialized() resolves false', async () => {
    dataService.ensureInitialized.mockResolvedValueOnce(false);

    const result = await buildClient().list();

    expect(result.framework).toBe('enterprise');
    expect(result.frameworkVersion).toBeUndefined();
    expect(result.tactics).toHaveLength(0);
    expect(result.techniques).toHaveLength(0);
    expect(result.subtechniques).toHaveLength(0);
    expect(savedObjectsRepository.find).not.toHaveBeenCalled();
  });
});
