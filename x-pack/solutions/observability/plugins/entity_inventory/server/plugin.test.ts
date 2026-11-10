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
import { ENTITY_DEFINITIONS } from './definitions';
import { k8sDeploymentDefinition } from './definitions/kubernetes/k8s_deployment';
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

describe('EntityInventoryPlugin setup', () => {
  it('registers every definition of ENTITY_DEFINITIONS with the entity store', () => {
    const registerEntityDefinition = jest.fn().mockReturnValue({ ok: true });
    const { plugin } = buildPlugin();

    plugin.setup(coreMock.createSetup(), {
      entityStore: buildEntityStoreSetup(registerEntityDefinition),
    });

    expect(registerEntityDefinition).toHaveBeenCalledWith(k8sDeploymentDefinition);
    expect(registerEntityDefinition).toHaveBeenCalledTimes(ENTITY_DEFINITIONS.length);
    expect(registerEntityDefinition.mock.calls.map(([definition]) => definition)).toEqual([
      ...ENTITY_DEFINITIONS,
    ]);
  });

  it('logs the rejected types and keeps setting up when the registry rejects a definition', () => {
    const registerEntityDefinition = jest
      .fn()
      .mockReturnValue({ ok: false, reason: 'type name is already registered' });
    const { plugin, logger } = buildPlugin();

    expect(() =>
      plugin.setup(coreMock.createSetup(), {
        entityStore: buildEntityStoreSetup(registerEntityDefinition),
      })
    ).not.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      `Entity inventory could not register ${ENTITY_DEFINITIONS.length} of ${
        ENTITY_DEFINITIONS.length
      } entity definitions: ${ENTITY_DEFINITIONS.map(({ type }) => type).join(', ')}`
    );
    expect(logger.debug).not.toHaveBeenCalledWith(
      expect.stringContaining('Entity inventory registered')
    );
  });

  it('logs the registered types at debug and no error when every definition registers', () => {
    const registerEntityDefinition = jest.fn().mockReturnValue({ ok: true });
    const { plugin, logger } = buildPlugin();

    plugin.setup(coreMock.createSetup(), {
      entityStore: buildEntityStoreSetup(registerEntityDefinition),
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Entity inventory registered ${
        ENTITY_DEFINITIONS.length
      } entity definitions: ${ENTITY_DEFINITIONS.map(({ type }) => type).join(', ')}`
    );
  });
});
