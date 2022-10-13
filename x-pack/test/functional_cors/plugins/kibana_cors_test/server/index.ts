/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { CorsTestPlugin } from './plugin';
import { configSchema, ConfigSchema } from './config';

export const plugin = (initContext: PluginInitializerContext) => new CorsTestPlugin(initContext);

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
};
