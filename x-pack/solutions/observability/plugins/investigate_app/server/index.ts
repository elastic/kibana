/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { InvestigateAppConfig } from './config';
import { InvestigateAppPlugin } from './plugin';
import type {
  InvestigateAppServerSetup,
  InvestigateAppServerStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies,
} from './types';
import { config as configSchema } from './config';

export type { InvestigateAppServerRouteRepository } from './routes/get_global_investigate_app_server_route_repository';

export type { InvestigateAppServerSetup, InvestigateAppServerStart };

export const config: PluginConfigDescriptor<InvestigateAppConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    enabled: true,
  },
};

export const plugin: PluginInitializer<
  InvestigateAppServerSetup,
  InvestigateAppServerStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<InvestigateAppConfig>) =>
  new InvestigateAppPlugin(pluginInitializerContext);
