/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ObservabilityAIAssistantAppConfig } from './config';

export { CHANGES_FUNCTION_NAME } from './functions/changes';
export { QUERY_FUNCTION_NAME } from './functions/query';
import { config as configSchema } from './config';
export type {
  ObservabilityAIAssistantAppServerStart,
  ObservabilityAIAssistantAppServerSetup,
} from './types';

export const config: PluginConfigDescriptor<ObservabilityAIAssistantAppConfig> = {
  exposeToBrowser: {},
  schema: configSchema,
};

export const plugin = async (ctx: PluginInitializerContext<ObservabilityAIAssistantAppConfig>) => {
  const { ObservabilityAIAssistantAppPlugin } = await import('./plugin');
  return new ObservabilityAIAssistantAppPlugin(ctx);
};
