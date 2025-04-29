/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { SLOPlugin } from './plugin';
import type {
  SLOPublicSetup,
  SLOPublicStart,
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart,
} from './types';

export const plugin: PluginInitializer<
  SLOPublicSetup,
  SLOPublicStart,
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new SLOPlugin(initializerContext);
};

export type {
  SLOPublicPluginsSetup,
  SLOPublicPluginsStart,
  SLOPublicStart,
  SLOPublicSetup,
} from './types';
