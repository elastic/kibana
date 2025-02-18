/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';
import { createMigrationSavedObject } from './create_migration_saved_object';

describe('createMigrationSavedObjects', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  it('returns the SavedObject if valid', () => {
    // @ts-expect-error response mock is missing a few fields
    soClient.create.mockResolvedValue(getSignalsMigrationSavedObjectMock());
    const { attributes } = getSignalsMigrationSavedObjectMock();

    return expect(
      createMigrationSavedObject({ attributes, soClient, username: 'username' })
    ).resolves.toEqual(getSignalsMigrationSavedObjectMock());
  });

  it('rejects if response is invalid', () => {
    const { attributes } = getSignalsMigrationSavedObjectMock();
    // @ts-expect-error stubbing our SO creation
    soClient.create.mockResolvedValue({ ...getSignalsMigrationSavedObjectMock(), id: null });

    return expect(
      createMigrationSavedObject({ attributes, soClient, username: 'username' })
    ).rejects.toThrow('Invalid value "null" supplied to "id"');
  });

  it('does not pass excess fields', async () => {
    // @ts-expect-error response mock is missing a few fields
    soClient.create.mockResolvedValue(getSignalsMigrationSavedObjectMock());
    const { attributes } = getSignalsMigrationSavedObjectMock();
    const attributesWithExtra = { ...attributes, extra: true };

    const result = await createMigrationSavedObject({
      attributes: attributesWithExtra,
      soClient,
      username: 'username',
    });
    expect(result).toEqual(getSignalsMigrationSavedObjectMock());

    const [call] = soClient.create.mock.calls;
    const attrs = call[1] as Record<string, unknown>;

    expect(Object.keys(attrs)).not.toContain('extra');
  });

  it('rejects if attributes are invalid', () => {
    const { attributes } = getSignalsMigrationSavedObjectMock();
    // @ts-expect-error intentionally breaking the type
    attributes.destinationIndex = null;

    return expect(
      createMigrationSavedObject({ attributes, soClient, username: 'username' })
    ).rejects.toThrow('Invalid value "null" supplied to "destinationIndex"');
  });
});
