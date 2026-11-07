/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import { K8S_ENTITY_DEFINITIONS } from './k8s_definitions';
import { registerInventoryDefinitions } from './register_definitions';

const createEntityStore = (registerEntityDefinition: jest.Mock) =>
  ({ registerEntityDefinition } as unknown as EntityStoreSetupContract);

describe('registerInventoryDefinitions', () => {
  it('registers every k8s definition and logs nothing when all are accepted', () => {
    const logger = loggingSystemMock.createLogger();
    const register = jest.fn().mockReturnValue({ ok: true });

    registerInventoryDefinitions(createEntityStore(register), logger);

    expect(register.mock.calls.map(([definition]) => definition)).toEqual(K8S_ENTITY_DEFINITIONS);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns about a rejected definition and still registers the rest', () => {
    const logger = loggingSystemMock.createLogger();
    const register = jest
      .fn()
      .mockReturnValueOnce({ ok: false, reason: 'duplicate type' })
      .mockReturnValue({ ok: true });

    registerInventoryDefinitions(createEntityStore(register), logger);

    expect(register).toHaveBeenCalledTimes(K8S_ENTITY_DEFINITIONS.length);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Entity inventory could not register the k8s.node definition: duplicate type'
    );
  });
});
