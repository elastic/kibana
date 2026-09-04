/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type {
  EntitiesRuntimeCaueServerSetup,
  EntitiesRuntimeCaueServerStart,
  EntitiesRuntimeCaueServerSetupDependencies,
  EntitiesRuntimeCaueServerStartDependencies,
} from './types';
import { entityDefinitionSavedObjectType } from './saved_objects/entity_definition';
import { registerDefinitionRoutes } from './routes/definitions';
import { registerEntitiesRoutes } from './routes/entities';
import { registerEntityMetadataRoutes } from './routes/entity_metadata';

export class EntitiesRuntimeCaueServerPlugin
  implements
    Plugin<
      EntitiesRuntimeCaueServerSetup,
      EntitiesRuntimeCaueServerStart,
      EntitiesRuntimeCaueServerSetupDependencies,
      EntitiesRuntimeCaueServerStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
  }

  public setup(
    core: CoreSetup<EntitiesRuntimeCaueServerStartDependencies>,
    _plugins: EntitiesRuntimeCaueServerSetupDependencies
  ): EntitiesRuntimeCaueServerSetup {
    core.savedObjects.registerType(entityDefinitionSavedObjectType);

    const router = core.http.createRouter();
    registerDefinitionRoutes({ router, getStartServices: core.getStartServices });
    registerEntitiesRoutes({
      router,
      getStartServices: core.getStartServices,
      logger: this.logger,
    });
    registerEntityMetadataRoutes({ router, getStartServices: core.getStartServices });

    return {};
  }

  public start(_core: CoreStart): EntitiesRuntimeCaueServerStart {
    return {};
  }

  public stop(): void {}
}
