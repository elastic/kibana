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
import type { StreamsAppConfig } from './config';
import { StreamsAppPlugin } from './plugin';
import type {
  StreamsAppServerSetup,
  StreamsAppServerStart,
  StreamsAppSetupDependencies,
  StreamsAppStartDependencies,
} from './types';

export type { StreamsAppServerSetup, StreamsAppServerStart };

import { config as configSchema } from './config';

export const config: PluginConfigDescriptor<StreamsAppConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  StreamsAppServerSetup,
  StreamsAppServerStart,
  StreamsAppSetupDependencies,
  StreamsAppStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<StreamsAppConfig>) =>
  new StreamsAppPlugin(pluginInitializerContext);
