/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { findMigrationSavedObjects } from './find_migration_saved_objects';
import { getMigrationSavedObjectsByIndex } from './get_migration_saved_objects_by_index';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';

jest.mock('./find_migration_saved_objects');

describe('getMigrationSavedObjectsByIndex', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  it('aggregates migrations by index', async () => {
    const indices = ['index1', 'index2'];
    const migrations = indices.flatMap((index) => [
      getSignalsMigrationSavedObjectMock({ sourceIndex: index, version: 1 }),
      getSignalsMigrationSavedObjectMock({ sourceIndex: index, version: 2 }),
    ]);
    (findMigrationSavedObjects as jest.Mock).mockResolvedValueOnce(migrations);

    const result = await getMigrationSavedObjectsByIndex({
      soClient,
      index: indices,
    });

    expect(result).toEqual({
      index1: [
        expect.objectContaining({
          attributes: expect.objectContaining({ sourceIndex: 'index1', version: 1 }),
        }),
        expect.objectContaining({
          attributes: expect.objectContaining({ sourceIndex: 'index1', version: 2 }),
        }),
      ],
      index2: [
        expect.objectContaining({
          attributes: expect.objectContaining({ sourceIndex: 'index2', version: 1 }),
        }),
        expect.objectContaining({
          attributes: expect.objectContaining({ sourceIndex: 'index2', version: 2 }),
        }),
      ],
    });
  });
});
