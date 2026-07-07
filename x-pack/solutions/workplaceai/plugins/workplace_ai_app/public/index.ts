/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { WorkplaceAIAppPlugin } from './plugin';
import type {
  WorkplaceAIAppPluginSetup,
  WorkplaceAIAppPluginStart,
  WorkplaceAIAppPluginStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  WorkplaceAIAppPluginSetup,
  WorkplaceAIAppPluginStart,
  {},
  WorkplaceAIAppPluginStartDependencies
> = (context: PluginInitializerContext) => {
  return new WorkplaceAIAppPlugin(context);
};

export type { WorkplaceAIAppPluginSetup, WorkplaceAIAppPluginStart } from './types';
