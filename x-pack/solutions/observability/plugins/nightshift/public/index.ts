/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { NightshiftPlugin } from './plugin';
import type {
  NightshiftPublicSetup,
  NightshiftPublicStart,
  NightshiftSetupDependencies,
  NightshiftStartDependencies,
} from './types';

export type { NightshiftPublicSetup, NightshiftPublicStart };

export const plugin: PluginInitializer<
  NightshiftPublicSetup,
  NightshiftPublicStart,
  NightshiftSetupDependencies,
  NightshiftStartDependencies
> = (ctx) => new NightshiftPlugin(ctx);
