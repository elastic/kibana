/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import { getMockMitreTactic } from '../../mocks/mitre_entities.mock';
import { resolveLatestVersion } from './resolve_latest_version';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../../saved_objects';

describe('resolveLatestVersion', () => {
  let savedObjectsRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    savedObjectsRepository = savedObjectsRepositoryMock.create();
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the framework_version of the first result when documents exist', async () => {
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

    const result = await resolveLatestVersion({
      savedObjectsRepository,
      logger,
      framework: 'enterprise',
    });

    expect(result).toBe('15.1');
  });

  it('returns undefined and logs debug when no documents exist for the framework', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
    });

    const result = await resolveLatestVersion({
      savedObjectsRepository,
      logger,
      framework: 'enterprise',
    });

    expect(result).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("no documents found for framework 'enterprise'")
    );
  });

  it('requests only the newest matching document', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
    });

    await resolveLatestVersion({ savedObjectsRepository, logger, framework: 'enterprise' });

    expect(savedObjectsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'framework_version',
        sortOrder: 'desc',
        perPage: 1,
      })
    );
  });

  it('queries across all namespaces', async () => {
    savedObjectsRepository.find.mockResolvedValueOnce({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
    });

    await resolveLatestVersion({ savedObjectsRepository, logger, framework: 'enterprise' });

    expect(savedObjectsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ namespaces: ['*'] })
    );
  });
});
