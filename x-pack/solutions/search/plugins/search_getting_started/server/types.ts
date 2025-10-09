/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchGettingStartedPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchGettingStartedPluginStart {}

export interface SearchGettingStartedPluginSetupDeps {
  share: SharePluginSetup;
  licensing: LicensingPluginSetup;
}

export interface SearchGettingStartedPluginStartDeps {
  share: SharePluginStart;
  licensing: LicensingPluginStart;
}
