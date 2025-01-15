/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateLegacyPrivateLocations } from './migrate_legacy_private_locations';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { type ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/logging';

describe('migrateLegacyPrivateLocations', () => {
  let loggerMockVal: Logger;
  let repositoryMock: jest.Mocked<ISavedObjectsRepository>;
  beforeEach(() => {
    repositoryMock = savedObjectsRepositoryMock.create();
    loggerMockVal = loggerMock.create();
  });

  it('should get the legacy private locations', async () => {
    repositoryMock.get.mockResolvedValueOnce({
      attributes: { locations: [{ id: '1', label: 'Location 1' }] },
    } as any);
    repositoryMock.find.mockResolvedValueOnce({ total: 1 } as any);

    await migrateLegacyPrivateLocations(repositoryMock, loggerMockVal);

    expect(repositoryMock.get).toHaveBeenCalledWith(
      'synthetics-privates-locations',
      'synthetics-privates-locations-singleton'
    );
  });

  it('should log and return if an error occurs while getting legacy private locations', async () => {
    const error = new Error('Get error');
    repositoryMock.get.mockResolvedValueOnce({
      attributes: { locations: [{ id: '1', label: 'Location 1' }] },
    } as any);
    repositoryMock.bulkCreate.mockRejectedValueOnce(error);

    await migrateLegacyPrivateLocations(repositoryMock, loggerMockVal);

    expect(loggerMockVal.error).toHaveBeenCalledWith(
      'Error migrating legacy private locations: Error: Get error'
    );
  });

  it('should return if there are no legacy locations', async () => {
    repositoryMock.get.mockResolvedValueOnce({
      attributes: { locations: [] },
    } as any);

    await migrateLegacyPrivateLocations(repositoryMock, loggerMockVal);

    expect(repositoryMock.bulkCreate).not.toHaveBeenCalled();
  });

  it('should bulk create new private locations if there are legacy locations', async () => {
    const legacyLocations = [{ id: '1', label: 'Location 1' }];
    repositoryMock.get.mockResolvedValueOnce({
      attributes: { locations: legacyLocations },
    } as any);
    repositoryMock.find.mockResolvedValueOnce({ total: 1 } as any);

    await migrateLegacyPrivateLocations(repositoryMock, loggerMockVal);

    expect(repositoryMock.bulkCreate).toHaveBeenCalledWith(
      legacyLocations.map((location) => ({
        id: location.id,
        attributes: location,
        type: 'synthetics-private-location',
        initialNamespaces: ['*'],
      })),
      { overwrite: true }
    );
  });

  it('should delete legacy private locations if bulk create count matches', async () => {
    const legacyLocations = [{ id: '1', label: 'Location 1' }];
    repositoryMock.get.mockResolvedValueOnce({
      attributes: { locations: legacyLocations },
    } as any);
    repositoryMock.find.mockResolvedValueOnce({ total: 1 } as any);

    await migrateLegacyPrivateLocations(repositoryMock, loggerMockVal);

    expect(repositoryMock.delete).toHaveBeenCalledWith(
      'synthetics-privates-locations',
      'synthetics-privates-locations-singleton',
      {}
    );
  });
});
