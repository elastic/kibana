/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { MultiplayerPlugin } from './plugin';

import type { MultiplayerPublicSetup, MultiplayerPublicStart } from './types';

export const plugin: PluginInitializer<MultiplayerPublicSetup, MultiplayerPublicStart> = (
  initializerContext: PluginInitializerContext
) => {
  return new MultiplayerPlugin(initializerContext);
};
