/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { EntityInventoryConfig } from './config';
import { EntityInventoryPlugin } from './plugin';
import { entityInventoryRouteRepository } from './routes';

jest.mock('@kbn/server-route-repository', () => ({
  ...jest.requireActual('@kbn/server-route-repository'),
  registerRoutes: jest.fn(),
}));

const buildPlugin = () => {
  const initializerContext = coreMock.createPluginInitializerContext<EntityInventoryConfig>({
    enabled: true,
  });
  return {
    plugin: new EntityInventoryPlugin(initializerContext),
    logger: initializerContext.logger.get(),
  };
};

const buildEntityStoreSetup = (registerEntityDefinition: jest.Mock): EntityStoreSetupContract => ({
  registerEntityMaintainer: jest.fn(),
  registerEntityDefinition,
});

describe('EntityInventoryPlugin routes', () => {
  const registerRoutesMock = jest.mocked(registerRoutes);

  const setUpWithStartDependencies = () => {
    const getEntityDefinitionsClient = jest.fn().mockReturnValue({ list: jest.fn() });
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    core.getStartServices.mockResolvedValue([
      coreStart,
      { entityStore: { getEntityDefinitionsClient } },
      undefined,
    ]);
    const { plugin } = buildPlugin();
    plugin.setup(core, {
      entityStore: buildEntityStoreSetup(jest.fn().mockReturnValue({ ok: true })),
    });
    const { lastCall } = registerRoutesMock.mock;
    if (!lastCall) {
      throw new Error('registerRoutes was not called during setup');
    }
    const [{ dependencies }] = lastCall;
    return {
      coreStart,
      getEntityDefinitionsClient,
      getInventoryService: dependencies.getInventoryService,
    };
  };

  beforeEach(() => {
    registerRoutesMock.mockClear();
  });

  it('registers the route repository in setup', () => {
    const { plugin } = buildPlugin();

    plugin.setup(coreMock.createSetup(), {
      entityStore: buildEntityStoreSetup(jest.fn().mockReturnValue({ ok: true })),
    });

    expect(registerRoutesMock).toHaveBeenCalledTimes(1);
    expect(registerRoutesMock).toHaveBeenCalledWith(
      expect.objectContaining({ repository: entityInventoryRouteRepository })
    );
  });

  it('builds the service from the entity definitions client for the request', async () => {
    const { getEntityDefinitionsClient, getInventoryService } = setUpWithStartDependencies();
    const request = httpServerMock.createKibanaRequest();

    await getInventoryService(request);

    expect(getEntityDefinitionsClient).toHaveBeenCalledWith(request);
  });

  it('queries Elasticsearch as the requesting user', async () => {
    const { coreStart, getInventoryService } = setUpWithStartDependencies();
    const request = httpServerMock.createKibanaRequest();

    await getInventoryService(request);

    expect(coreStart.elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
  });
});
