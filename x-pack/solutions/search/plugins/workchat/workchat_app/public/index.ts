/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { PublicConfigType, SearchAssistantPlugin } from './plugin';
import {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  {},
  WorkChatAppPluginStartDependencies
> = (context: PluginInitializerContext<PublicConfigType>) => {
  return new SearchAssistantPlugin(context);
};

export type { WorkChatAppPluginSetup, WorkChatAppPluginStart } from './types';
