/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, Plugin } from '../../../../../../../src/core/server';
import { initRoutes } from './init_routes';

export const plugin: PluginInitializer<void, void> = (initializerContext): Plugin => ({
  setup: (core) => initRoutes(initializerContext, core),
  start: () => {},
  stop: () => {},
});
