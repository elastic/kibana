/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { createSandboxConnectorSettingsClient } from './sandbox_connector_settings_client';
import {
  NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_ID,
  NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE,
} from '../saved_objects';

const setup = ({ disabledIds }: { disabledIds?: string[] } = {}) => {
  const soClient = {
    get: jest.fn(async () => {
      if (!disabledIds) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE,
          NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_ID
        );
      }
      return { attributes: { disabled_connector_ids: disabledIds } };
    }),
    create: jest.fn(async (_type: string, attributes: unknown) => ({ attributes })),
  };
  const scoped = { asScopedToNamespace: jest.fn(() => soClient) };
  const savedObjects = { getScopedClient: jest.fn(() => scoped) };
  const client = createSandboxConnectorSettingsClient({
    getDeps: () => ({ savedObjects: savedObjects as never, spaces: undefined }),
  });
  return { client, soClient, savedObjects, request: httpServerMock.createKibanaRequest() };
};

describe('sandbox connector settings client', () => {
  it('treats a missing object as everything on', async () => {
    const { client, request } = setup();

    await expect(client.getDisabledConnectorIds(request)).resolves.toEqual([]);
  });

  it('reads the hidden type in the request space without the security extension', async () => {
    const { client, savedObjects, request } = setup({ disabledIds: ['github'] });

    await expect(client.getDisabledConnectorIds(request)).resolves.toEqual(['github']);
    expect(savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes: [NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE],
    });
  });

  it('switches a connector off by adding it to the stored set', async () => {
    const { client, soClient, request } = setup({ disabledIds: ['github'] });

    await expect(
      client.setConnectorEnabled(request, { connectorId: 'telemetry', enabled: false })
    ).resolves.toEqual(['github', 'telemetry']);
    expect(soClient.create).toHaveBeenCalledWith(
      NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE,
      { disabled_connector_ids: ['github', 'telemetry'] },
      { id: NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_ID, overwrite: true }
    );
  });

  it('switches a connector back on by removing it, creating the object on first write', async () => {
    const { client, soClient, request } = setup({ disabledIds: ['github', 'telemetry'] });

    await expect(
      client.setConnectorEnabled(request, { connectorId: 'github', enabled: true })
    ).resolves.toEqual(['telemetry']);
    expect(soClient.create).toHaveBeenCalledTimes(1);
  });

  it('does not write when the switch is already in that state', async () => {
    const { client, soClient, request } = setup();

    await expect(
      client.setConnectorEnabled(request, { connectorId: 'github', enabled: true })
    ).resolves.toEqual([]);
    expect(soClient.create).not.toHaveBeenCalled();
  });
});
