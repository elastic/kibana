/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type {
  Logger,
  SavedObjectsServiceStart,
  IRouter,
  StartServicesAccessor,
} from '@kbn/core/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/server';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';

import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { LogsSharedPluginSetup } from '@kbn/logs-shared-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { SearchConnectorsPluginSetup } from '@kbn/search-connectors-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import type { GlobalConfigService } from './services/global_config_service';

import type { ConfigType } from '.';

export interface PluginsSetup {
  cloud?: CloudSetup;
  customIntegrations?: CustomIntegrationsPluginSetup;
  features: FeaturesPluginSetup;
  globalSearch: GlobalSearchPluginSetup;
  guidedOnboarding?: GuidedOnboardingPluginSetup;
  licensing: LicensingPluginStart;
  logsShared: LogsSharedPluginSetup;
  ml?: MlPluginSetup;
  searchConnectors?: SearchConnectorsPluginSetup;
  security: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface PluginsStart {
  cloud?: CloudStart;
  data: DataPluginStart;
  fleet?: FleetStartContract;
  spaces?: SpacesPluginStart;
}

export interface RouteDependencies {
  config: ConfigType;
  getSavedObjectsService?(): SavedObjectsServiceStart;
  getStartServices: StartServicesAccessor<PluginsStart, unknown>;
  globalConfigService: GlobalConfigService;
  licensing?: LicensingPluginStart;
  log: Logger;
  ml?: MlPluginSetup;
  router: IRouter;
}
