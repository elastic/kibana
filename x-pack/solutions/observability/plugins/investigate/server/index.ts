/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginInitializer,
  PluginInitializerContext,
  PluginConfigDescriptor,
} from '@kbn/core/server';
import { InvestigateConfig } from './config';

import { InvestigatePlugin } from './plugin';
import type {
  InvestigateServerSetup,
  InvestigateServerStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies,
} from './types';

import { config as configSchema } from './config';

export type { InvestigateServerSetup, InvestigateServerStart };

export const config: PluginConfigDescriptor<InvestigateConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  InvestigateServerSetup,
  InvestigateServerStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<InvestigateConfig>) =>
  await new InvestigatePlugin(pluginInitializerContext);
