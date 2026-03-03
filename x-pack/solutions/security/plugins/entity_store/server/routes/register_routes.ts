/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  registerInstall,
  registerUninstall,
  registerStop,
  registerStart,
  registerStatus,
  registerForceLogExtraction,
  registerForceCcsExtractToUpdates,
  registerCRUDUpsert,
  registerCRUDUpsertBulk,
  registerCRUDDelete,
} from './apis';
import type { EntityStorePluginRouter } from '../types';

export function registerRoutes(router: EntityStorePluginRouter) {
  registerInstall(router);
  registerStop(router);
  registerStatus(router);
  registerUninstall(router);
  registerForceLogExtraction(router);
  registerForceCcsExtractToUpdates(router);
  registerCRUDUpsert(router);
  registerCRUDUpsertBulk(router);
  registerCRUDDelete(router);
  registerStart(router);
}
