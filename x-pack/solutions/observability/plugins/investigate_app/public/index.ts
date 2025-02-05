/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { InvestigateAppPlugin } from './plugin';
import type {
  InvestigateAppPublicSetup,
  InvestigateAppPublicStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies,
  ConfigSchema,
} from './types';

export type { InvestigateAppPublicSetup, InvestigateAppPublicStart };

export const plugin: PluginInitializer<
  InvestigateAppPublicSetup,
  InvestigateAppPublicStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new InvestigateAppPlugin(pluginInitializerContext);
