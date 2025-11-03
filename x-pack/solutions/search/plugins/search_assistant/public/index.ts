/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type { PublicConfigType } from './plugin';
import { SearchAssistantPlugin } from './plugin';
import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  {},
  SearchAssistantPluginStartDependencies
> = (context: PluginInitializerContext<PublicConfigType>) => new SearchAssistantPlugin(context);

export type { SearchAssistantPluginSetup, SearchAssistantPluginStart } from './types';
