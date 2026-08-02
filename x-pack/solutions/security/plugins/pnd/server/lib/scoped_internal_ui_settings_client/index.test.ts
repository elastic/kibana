/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsServiceMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { getScopedInternalUiSettingsClient } from '.';

describe('getScopedInternalUiSettingsClient', () => {
  const setup = () => {
    const savedObjects = savedObjectsServiceMock.createStartContract();
    const scopedClient = { id: 'scoped-client' };
    const internalClient = { asScopedToNamespace: jest.fn().mockReturnValue(scopedClient) };
    (savedObjects.getUnsafeInternalClient as jest.Mock).mockReturnValue(internalClient);

    const uiSettings = uiSettingsServiceMock.createStartContract();
    const uiSettingsClient = uiSettingsServiceMock.createClient();
    (uiSettings.asScopedToClient as jest.Mock).mockReturnValue(uiSettingsClient);

    return { internalClient, savedObjects, scopedClient, uiSettings, uiSettingsClient };
  };

  it('creates a saved-objects client as the internal user', () => {
    const { savedObjects, uiSettings } = setup();

    getScopedInternalUiSettingsClient({ savedObjects, spaceId: 'agent-3', uiSettings });

    expect(savedObjects.getUnsafeInternalClient).toHaveBeenCalledTimes(1);
  });

  it('scopes the internal client to the requested namespace', () => {
    const { internalClient, savedObjects, uiSettings } = setup();

    getScopedInternalUiSettingsClient({ savedObjects, spaceId: 'agent-3', uiSettings });

    expect(internalClient.asScopedToNamespace).toHaveBeenCalledWith('agent-3');
  });

  it('binds the uiSettings client to the namespace-scoped internal client', () => {
    const { savedObjects, scopedClient, uiSettings } = setup();

    getScopedInternalUiSettingsClient({ savedObjects, spaceId: 'agent-3', uiSettings });

    expect(uiSettings.asScopedToClient).toHaveBeenCalledWith(scopedClient);
  });

  it('returns the scoped uiSettings client', () => {
    const { savedObjects, uiSettings, uiSettingsClient } = setup();

    const result = getScopedInternalUiSettingsClient({
      savedObjects,
      spaceId: 'agent-3',
      uiSettings,
    });

    expect(result).toBe(uiSettingsClient);
  });
});
