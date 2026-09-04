/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { EntitiesCauePlugin } from './plugin';
import type {
  EntitiesCauePublicSetup,
  EntitiesCauePublicStart,
  EntitiesCaueSetupDependencies,
  EntitiesCaueStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  EntitiesCauePublicSetup,
  EntitiesCauePublicStart,
  EntitiesCaueSetupDependencies,
  EntitiesCaueStartDependencies
> = () => new EntitiesCauePlugin();
