/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { EntityInventoryConfig } from './config';
import { plugin } from '.';
import { EntityInventoryPlugin } from './plugin';

describe('entityInventory plugin initializer', () => {
  it('resolves to an EntityInventoryPlugin instance', async () => {
    const initializerContext = coreMock.createPluginInitializerContext<EntityInventoryConfig>({
      enabled: true,
    });

    await expect(plugin(initializerContext)).resolves.toBeInstanceOf(EntityInventoryPlugin);
  });
});
