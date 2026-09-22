/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { SearchAlertingPlugin } from './plugin';
import type {
  SearchAlertingPublicSetup,
  SearchAlertingPublicStart,
  SearchAlertingSetupDependencies,
  SearchAlertingStartDependencies,
} from './types';

export type { SearchAlertingPublicSetup, SearchAlertingPublicStart };

export const plugin: PluginInitializer<
  SearchAlertingPublicSetup,
  SearchAlertingPublicStart,
  SearchAlertingSetupDependencies,
  SearchAlertingStartDependencies
> = () => new SearchAlertingPlugin();
