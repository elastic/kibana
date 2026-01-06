/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
import type { CoreSetup, IRouter } from '@kbn/core/server';
import { registerInstall } from './install';
import type { EntityStoreDependencies } from '../dependencies';
import { EntityStorePlugins } from '../types';

export const registerRoutes = ({ router, dependencies, plugins, core }: {
  router: IRouter,
  dependencies: EntityStoreDependencies,
  plugins: EntityStorePlugins,
  core: CoreSetup
}) => {
  registerInstall({ router, dependencies, plugins, core });
};
=======
import { registerInstall } from './install';
import type { EntityStorePluginRouter } from '../types';

export function registerRoutes(router: EntityStorePluginRouter) {
  registerInstall(router);
}
>>>>>>> romulets/entity-store/v2-enablement-api
