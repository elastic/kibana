/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CatalogService } from './services/catalog_service';
import type { CredentialsService } from './services/credentials_service';
import type { FlagsService } from './services/flags_service';
import type { ObservedContextsService } from './services/observed_contexts_service';

export interface FeatureFlagsManagementSetupDeps {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface FeatureFlagsManagementStartDeps {
  taskManager: TaskManagerStartContract;
}

export interface FeatureFlagsServices {
  environments: CatalogService<'environment'>;
  apps: CatalogService<'app'>;
  credentials: CredentialsService;
  flags: FlagsService;
  observedContexts: ObservedContextsService;
}

/** Resolves once the plugin has started. */
export type GetServices = () => Promise<FeatureFlagsServices>;
