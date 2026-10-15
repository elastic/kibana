/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createReadOnlySavedObjectsClient } from './create_read_only_saved_objects_client';

const CONFIG_ID = '9.6.0';

const setup = () => {
  const client = savedObjectsClientMock.create();
  return { client, readOnly: createReadOnlySavedObjectsClient(client) };
};

/** The error a refused call throws, or `undefined` when it does not throw. */
const errorOf = (call: () => unknown): unknown => {
  try {
    call();
    return undefined;
  } catch (error) {
    return error;
  }
};

describe('createReadOnlySavedObjectsClient', () => {
  describe('a space with a `config` object for this version', () => {
    it('returns the stored settings from the underlying client', async () => {
      const { client, readOnly } = setup();
      const config = {
        attributes: { 'securitySolution:enableAlertZero': true },
        id: CONFIG_ID,
        references: [],
        type: 'config',
      };
      client.get.mockResolvedValue(config);

      await expect(readOnly.get('config', CONFIG_ID)).resolves.toBe(config);
      expect(client.get).toHaveBeenCalledWith('config', CONFIG_ID);
    });
  });

  describe('a space with no `config` object for this version', () => {
    it('passes the not-found error of the read through', async () => {
      const { client, readOnly } = setup();
      client.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('config', CONFIG_ID)
      );

      const error = await readOnly.get('config', CONFIG_ID).catch((caught: unknown) => caught);

      expect(SavedObjectsErrorHelpers.isNotFoundError(error as Error)).toBe(true);
    });

    it('lets the lookup for an older `config` object to upgrade through', async () => {
      const { client, readOnly } = setup();
      const found = { page: 1, per_page: 1000, saved_objects: [], total: 0 };
      client.find.mockResolvedValue(found);

      await expect(readOnly.find({ type: 'config' })).resolves.toBe(found);
    });

    it('refuses the create that would add the object, as a forbidden error, without calling the client', () => {
      const { client, readOnly } = setup();

      const error = errorOf(() => readOnly.create('config', { buildNum: 1 }, { id: CONFIG_ID }));

      expect({
        created: client.create.mock.calls.length,
        forbidden: SavedObjectsErrorHelpers.isForbiddenError(error as Error),
      }).toEqual({ created: 0, forbidden: true });
    });
  });

  it.each([
    ['bulkCreate'],
    ['bulkDelete'],
    ['bulkUpdate'],
    ['changeAccessMode'],
    ['changeOwnership'],
    ['delete'],
    ['removeReferencesTo'],
    ['update'],
    ['updateObjectsSpaces'],
  ] as const)('refuses %s without calling the client', (method) => {
    const { client, readOnly } = setup();

    const error = errorOf(() => (readOnly[method] as () => unknown)());

    expect({
      called: client[method].mock.calls.length,
      forbidden: SavedObjectsErrorHelpers.isForbiddenError(error as Error),
    }).toEqual({ called: 0, forbidden: true });
  });

  it('refuses to hand out an unwrapped client for another namespace', () => {
    const { client, readOnly } = setup();

    const error = errorOf(() => readOnly.asScopedToNamespace('space-b'));

    expect({
      called: client.asScopedToNamespace.mock.calls.length,
      forbidden: SavedObjectsErrorHelpers.isForbiddenError(error as Error),
    }).toEqual({ called: 0, forbidden: true });
  });

  it('reports the namespace of the underlying client, which keys the settings cache', () => {
    const { client, readOnly } = setup();
    client.getCurrentNamespace.mockReturnValue('space-a');

    expect(readOnly.getCurrentNamespace()).toBe('space-a');
  });
});
