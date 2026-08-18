/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ObservabilitySharedPluginSetup } from '@kbn/observability-shared-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export interface EntitiesCaueSetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
}

export interface EntitiesCaueStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntitiesCauePublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntitiesCauePublicStart {}
