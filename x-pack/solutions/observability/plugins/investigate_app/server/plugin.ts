/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { mapValues } from 'lodash';
import { registerServerRoutes } from './routes/register_routes';
import { InvestigateAppRouteHandlerResources } from './routes/types';
import type {
  ConfigSchema,
  InvestigateAppServerSetup,
  InvestigateAppServerStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies,
} from './types';
import { investigation } from './saved_objects/investigation';
import { InvestigateAppConfig } from './config';
import { registerUsageCollector } from './lib/collectors/register';

export class InvestigateAppPlugin
  implements
    Plugin<
      InvestigateAppServerSetup,
      InvestigateAppServerStart,
      InvestigateAppSetupDependencies,
      InvestigateAppStartDependencies
    >
{
  logger: Logger;
  config: InvestigateAppConfig;
  private isDev;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.isDev = context.env.mode.dev;
    this.logger = context.logger.get();
    this.config = context.config.get<InvestigateAppConfig>();
  }
  setup(
    coreSetup: CoreSetup<InvestigateAppStartDependencies, InvestigateAppServerStart>,
    pluginsSetup: InvestigateAppSetupDependencies
  ): InvestigateAppServerSetup {
    const routeHandlerPlugins = mapValues(pluginsSetup, (value, key) => {
      return {
        setup: value,
        start: () =>
          coreSetup.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return (pluginsStartContracts as any)[key];
          }),
      };
    }) as InvestigateAppRouteHandlerResources['plugins'];

    if (this.config.enabled === true) {
      coreSetup.savedObjects.registerType(investigation);
      registerUsageCollector(pluginsSetup.usageCollection);

      registerServerRoutes({
        core: coreSetup,
        logger: this.logger,
        dependencies: {
          plugins: routeHandlerPlugins,
        },
        isDev: this.isDev,
      });
    }

    return {};
  }

  start(core: CoreStart, pluginsStart: InvestigateAppStartDependencies): InvestigateAppServerStart {
    return {};
  }
}
