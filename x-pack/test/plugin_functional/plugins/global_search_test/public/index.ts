/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'src/core/public';
import {
  GlobalSearchTestPlugin,
  GlobalSearchTestPluginSetup,
  GlobalSearchTestPluginStart,
  GlobalSearchTestPluginSetupDeps,
  GlobalSearchTestPluginStartDeps,
} from './plugin';

export const plugin: PluginInitializer<
  GlobalSearchTestPluginSetup,
  GlobalSearchTestPluginStart,
  GlobalSearchTestPluginSetupDeps,
  GlobalSearchTestPluginStartDeps
> = () => new GlobalSearchTestPlugin();

export {
  GlobalSearchTestPluginSetup,
  GlobalSearchTestPluginStart,
  GlobalSearchTestPluginSetupDeps,
  GlobalSearchTestPluginStartDeps,
} from './plugin';
