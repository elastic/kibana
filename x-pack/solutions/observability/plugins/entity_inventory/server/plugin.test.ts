/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import type { EntityInventoryConfig } from './config';
import { ENTITY_DEFINITIONS } from './definitions';
import { k8sDeploymentDefinition } from './definitions/kubernetes/k8s_deployment';
import { EntityInventoryPlugin } from './plugin';

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
