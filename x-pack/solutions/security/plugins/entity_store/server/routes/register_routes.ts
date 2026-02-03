/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerInstall, registerStop } from './apis';
import type { EntityStorePluginRouter } from '../types';
import { registerUninstall } from './apis/uninstall';

export function registerRoutes(router: EntityStorePluginRouter) {
  registerInstall(router);
  registerStop(router);
  registerUninstall(router);
}
