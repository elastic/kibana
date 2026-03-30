/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceStart,
  ApplicationStart,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  FeatureFlagsStart,
  HttpStart,
  NotificationsStart,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type {
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginStart,
} from './plugin';
import { ObservabilityOnboardingPlugin } from './plugin';

export interface ConfigSchema {
  ui: {
    enabled: boolean;
  };
  serverless: {
    enabled: boolean;
  };
}

export interface AppContext {
  isDev: boolean;
  isCloud: boolean;
  isServerless: boolean;
  stackVersion: string;
  cloudServiceProvider?: string;
}

export interface ObservabilityOnboardingAppServices {
  analytics: AnalyticsServiceStart;
  application: ApplicationStart;
  http: HttpStart;
  notifications: NotificationsStart;
  pricing: CoreStart['pricing'];
  rendering: CoreStart['rendering'];
  share: SharePluginStart;
  context: AppContext;
  config: ConfigSchema;
  docLinks: DocLinksStart;
  chrome: ChromeStart;
  featureFlags: FeatureFlagsStart;
  observability: ObservabilityPublicStart;
  streams?: StreamsPluginStart;
}

export const plugin: PluginInitializer<
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginStart
> = (ctx: PluginInitializerContext<ConfigSchema>) => new ObservabilityOnboardingPlugin(ctx);

export type { ObservabilityOnboardingPluginSetup, ObservabilityOnboardingPluginStart };
