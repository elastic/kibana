/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { PndPublicPlugin } from './plugin';
import type {
  PndClientConfig,
  PndPublicSetup,
  PndPublicStart,
  PndSetupDependencies,
  PndStartDependencies,
} from './types';

export type { PndPublicSetup, PndPublicStart };

export const plugin: PluginInitializer<
  PndPublicSetup,
  PndPublicStart,
  PndSetupDependencies,
  PndStartDependencies
> = (context: PluginInitializerContext<PndClientConfig>) => new PndPublicPlugin(context);
