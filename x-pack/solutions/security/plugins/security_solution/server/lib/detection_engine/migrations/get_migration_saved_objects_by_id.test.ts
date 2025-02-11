/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  getSignalsMigrationSavedObjectMock,
  getSignalsMigrationSavedObjectErrorMock,
} from './saved_objects_schema.mock';
import { getMigrationSavedObjectsById } from './get_migration_saved_objects_by_id';

describe('getMigrationSavedObjectsById', () => {
  let ids: string[];
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    ids = ['id1'];
    soClient = savedObjectsClientMock.create();
  });

  it('resolves an array of objects, if valid', async () => {
    // @ts-expect-error stubbing our SO call
    soClient.bulkGet.mockResolvedValue({ saved_objects: [getSignalsMigrationSavedObjectMock()] });
    const result = await getMigrationSavedObjectsById({
      ids,
      soClient,
    });

    expect(result).toEqual([getSignalsMigrationSavedObjectMock()]);
  });

  it('rejects if SO client throws', () => {
    const error = new Error('whoops');
    soClient.bulkGet.mockRejectedValue(error);

    return expect(getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(error);
  });

  it('throws a 404 error if the response includes a 404', async () => {
    soClient.bulkGet.mockResolvedValue({
      saved_objects: [
        // @ts-expect-error stubbing our SO call
        getSignalsMigrationSavedObjectErrorMock({ statusCode: 404, message: 'not found' }),
      ],
    });

    return expect(getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  it('rejects if response is invalid', () => {
    // @ts-expect-error intentionally breaking the type
    const badSavedObject = getSignalsMigrationSavedObjectMock({ destinationIndex: 4 });
    // @ts-expect-error stubbing our SO call
    soClient.bulkGet.mockResolvedValue({ saved_objects: [badSavedObject] });

    return expect(() => getMigrationSavedObjectsById({ ids, soClient })).rejects.toThrow(
      'Invalid value "4" supplied to "attributes,destinationIndex"'
    );
  });
});
