/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { CorsTestPlugin } from './plugin';
import { configSchema, ConfigSchema } from './config';

export const plugin = (initContext: PluginInitializerContext) => new CorsTestPlugin(initContext);

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
};
