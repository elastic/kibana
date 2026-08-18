/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreSetupContract, EntityStoreStartContract } from '@kbn/entity-store/server';

export interface EntitiesCaueServerSetupDependencies {
  entityStore: EntityStoreSetupContract;
}

export interface EntitiesCaueServerStartDependencies {
  entityStore: EntityStoreStartContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntitiesCaueServerSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntitiesCaueServerStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntitiesCaueServerSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntitiesCaueServerStart {}
