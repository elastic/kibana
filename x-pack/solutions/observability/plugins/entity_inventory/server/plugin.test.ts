/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { EntityInventoryConfig } from './config';
import { ENTITY_DEFINITIONS } from './definitions';
import { k8sDeploymentDefinition } from './definitions/kubernetes/k8s_deployment';
import { EntityInventoryPlugin } from './plugin';
import { entityInventoryRouteRepository } from './routes';
import type { EntityInventoryStartDependencies } from './types';

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
  });

  it('logs nothing when every definition registers', () => {
    const registerEntityDefinition = jest.fn().mockReturnValue({ ok: true });
    const { plugin, logger } = buildPlugin();

    plugin.setup(coreMock.createSetup(), {
      entityStore: buildEntityStoreSetup(registerEntityDefinition),
    });

    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('EntityInventoryPlugin routes', () => {
  const registerRoutesMock = jest.mocked(registerRoutes);

  const setUpWithStartDependencies = (
    startDependencies: Partial<EntityInventoryStartDependencies>
  ) => {
    const getEntityDefinitionsClientForSpace = jest.fn().mockReturnValue({ list: jest.fn() });
    const core = coreMock.createSetup();
    core.getStartServices.mockResolvedValue([
      coreMock.createStart(),
      { entityStore: { getEntityDefinitionsClientForSpace }, ...startDependencies },
      undefined,
    ]);
    const { plugin } = buildPlugin();
    plugin.setup(core, {
      entityStore: buildEntityStoreSetup(jest.fn().mockReturnValue({ ok: true })),
    });
    const [{ dependencies }] = registerRoutesMock.mock.calls[0];
    return {
      getEntityDefinitionsClientForSpace,
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

  it("builds the service for the request's space", async () => {
    const spaces = spacesMock.createStart();
    spaces.spacesService.getSpaceId = jest.fn().mockReturnValue('other');
    const { getEntityDefinitionsClientForSpace, getInventoryService } = setUpWithStartDependencies({
      spaces,
    });
    const request = httpServerMock.createKibanaRequest();

    await getInventoryService(request);

    expect(spaces.spacesService.getSpaceId).toHaveBeenCalledWith(request);
    expect(getEntityDefinitionsClientForSpace).toHaveBeenCalledWith('other');
  });

  it('falls back to the default space without the spaces plugin', async () => {
    const { getEntityDefinitionsClientForSpace, getInventoryService } = setUpWithStartDependencies(
      {}
    );

    await getInventoryService(httpServerMock.createKibanaRequest());

    expect(getEntityDefinitionsClientForSpace).toHaveBeenCalledWith('default');
  });
});
