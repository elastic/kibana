/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginStart {}

export interface SearchPlaygroundPluginSetupDependencies {
  cloud?: CloudSetup;
  features: FeaturesPluginSetup;
}

export interface SearchPlaygroundPluginStartDependencies {
  actions: ActionsPluginStartContract;
  cloud?: CloudStart;
}

export * from '../common/types';
