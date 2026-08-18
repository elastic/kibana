/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import { serviceHealthMaintainer } from './maintainer';
import { serviceDependenciesMaintainer } from './maintainer/service_dependencies';
import { registerServiceMetadataRoutes } from './routes/service_metadata';
import { registerServiceDependenciesRoutes } from './routes/service_dependencies';
import type {
  EntitiesCaueServerSetup,
  EntitiesCaueServerSetupDependencies,
  EntitiesCaueServerStartDependencies,
  EntitiesCaueServerStart,
} from './types';

export class EntitiesCaueServerPlugin
  implements
    Plugin<
      EntitiesCaueServerSetup,
      EntitiesCaueServerStart,
      EntitiesCaueServerSetupDependencies,
      EntitiesCaueServerStartDependencies
    >
{
  constructor(_ctx: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<EntitiesCaueServerStartDependencies>,
    plugins: EntitiesCaueServerSetupDependencies
  ): EntitiesCaueServerSetup {
    plugins.entityStore.registerEntityMaintainer(serviceHealthMaintainer);
    plugins.entityStore.registerEntityMaintainer(serviceDependenciesMaintainer);

    const router = core.http.createRouter();
    registerServiceMetadataRoutes({ router, getStartServices: core.getStartServices });
    registerServiceDependenciesRoutes({ router, getStartServices: core.getStartServices });

    return {};
  }

  public start(_core: CoreStart): EntitiesCaueServerStart {
    return {};
  }

  public stop(): void {}
}
