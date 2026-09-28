/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { ObservabilityAlertingPlugin } from './plugin';
import type {
  ObservabilityAlertingPublicSetup,
  ObservabilityAlertingPublicStart,
  ObservabilityAlertingSetupDependencies,
  ObservabilityAlertingStartDependencies,
} from './types';

export type { ObservabilityAlertingPublicSetup, ObservabilityAlertingPublicStart };

export const plugin: PluginInitializer<
  ObservabilityAlertingPublicSetup,
  ObservabilityAlertingPublicStart,
  ObservabilityAlertingSetupDependencies,
  ObservabilityAlertingStartDependencies
> = () => new ObservabilityAlertingPlugin();
