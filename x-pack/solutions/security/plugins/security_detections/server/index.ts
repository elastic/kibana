/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigType } from './config';
import { configSchema } from './config';
import type { SecurityDetectionsPlugin } from './plugin';

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    enableDetectionsOnV2: true,
  },
};

export const plugin = async (
  context: PluginInitializerContext
): Promise<SecurityDetectionsPlugin> => {
  const { SecurityDetectionsPlugin: Plugin } = await import('./plugin');
  return new Plugin(context);
};
