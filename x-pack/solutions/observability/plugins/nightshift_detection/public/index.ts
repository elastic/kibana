/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { NightshiftDetectionPlugin } from './plugin';

/** Browser entry point. It only hosts the engine inspector, deleted before the plugin ships on. */
export const plugin: PluginInitializer<void, void> = (context) =>
  new NightshiftDetectionPlugin(context);
