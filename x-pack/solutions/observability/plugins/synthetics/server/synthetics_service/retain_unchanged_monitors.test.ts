/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { RetainableMonitor } from './retain_unchanged_monitors';
import { readDecryptedMonitors } from './retain_unchanged_monitors';

describe('readDecryptedMonitors', () => {
  const logger = loggerMock.create();

  const monitor = (id: string, namespace?: string): RetainableMonitor => ({
    id: `monitor-${id}`,
    type: 'http',
    savedObjectId: `so-${id}`,
    savedObjectType: 'synthetics-monitor-multi-space',
    namespace,
  });

  const clientReading = (read: (id: string) => unknown) =>
    ({
      getDecryptedAsInternalUser: jest.fn(async (_type: string, id: string) => read(id)),
    } as unknown as EncryptedSavedObjectsClient & {
      getDecryptedAsInternalUser: jest.Mock;
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads each monitor by its type, id and space', async () => {
    const encryptedClient = clientReading((id) => ({ id }));

    const { monitors, unreadable } = await readDecryptedMonitors({
      encryptedClient,
      monitors: [monitor('a', 'default'), monitor('b', 'my-space')],
      logger,
    });

    expect(monitors).toEqual([{ id: 'so-a' }, { id: 'so-b' }]);
    expect(unreadable).toBe(0);
    expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      'synthetics-monitor-multi-space',
      'so-b',
      { namespace: 'my-space' }
    );
  });

  it('skips a monitor that was deleted since it was listed without counting it as unreadable', async () => {
    const encryptedClient = clientReading((id) => {
      if (id === 'so-gone') {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          'synthetics-monitor-multi-space',
          id
        );
      }
      return { id };
    });

    const { monitors, unreadable } = await readDecryptedMonitors({
      encryptedClient,
      monitors: [monitor('a'), monitor('gone')],
      logger,
    });

    expect(monitors).toEqual([{ id: 'so-a' }]);
    expect(unreadable).toBe(0);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('counts and reports a monitor that fails to be read for any other reason', async () => {
    const encryptedClient = clientReading((id) => {
      if (id === 'so-broken') {
        throw new Error('Unable to decrypt attribute "secrets"');
      }
      return { id };
    });

    const { monitors, unreadable } = await readDecryptedMonitors({
      encryptedClient,
      monitors: [monitor('a'), monitor('broken'), monitor('b')],
      logger,
    });

    expect(monitors).toEqual([{ id: 'so-a' }, { id: 'so-b' }]);
    expect(unreadable).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not read monitor so-broken to sync it: Unable to decrypt attribute "secrets"'
    );
  });
});
