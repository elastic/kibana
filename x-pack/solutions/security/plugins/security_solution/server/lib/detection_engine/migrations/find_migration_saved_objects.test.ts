/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';
import { findMigrationSavedObjects } from './find_migration_saved_objects';

describe('findMigrationSavedObjects', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  it('resolves an array of objects, if valid', async () => {
    // @ts-expect-error stubbing our SO call
    soClient.find.mockResolvedValue({ saved_objects: [getSignalsMigrationSavedObjectMock()] });
    const result = await findMigrationSavedObjects({
      soClient,
    });

    expect(result).toEqual([getSignalsMigrationSavedObjectMock()]);
  });

  it('rejects if SO client throws', () => {
    const error = new Error('whoops');
    soClient.find.mockRejectedValue(error);

    return expect(findMigrationSavedObjects({ soClient })).rejects.toThrow(error);
  });

  it('rejects if response is invalid', () => {
    // @ts-expect-error intentionally breaking the type
    const badSavedObject = getSignalsMigrationSavedObjectMock({ destinationIndex: 4 });
    // @ts-expect-error stubbing our SO call
    soClient.find.mockResolvedValue({ saved_objects: [badSavedObject] });

    return expect(() => findMigrationSavedObjects({ soClient })).rejects.toThrow(
      'Invalid value "4" supplied to "attributes,destinationIndex"'
    );
  });
});
