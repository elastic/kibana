/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { ObservabilityStreamsWrapperPlugin } from './plugin';
import type {
  ObservabilityStreamsWrapperPublicSetup,
  ObservabilityStreamsWrapperPublicStart,
  ObservabilityStreamsWrapperSetupDependencies,
  ObservabilityStreamsWrapperStartDependencies,
  ConfigSchema,
} from './types';

export type { ObservabilityStreamsWrapperPublicSetup, ObservabilityStreamsWrapperPublicStart };

export const plugin: PluginInitializer<
  ObservabilityStreamsWrapperPublicSetup,
  ObservabilityStreamsWrapperPublicStart,
  ObservabilityStreamsWrapperSetupDependencies,
  ObservabilityStreamsWrapperStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityStreamsWrapperPlugin(pluginInitializerContext);
