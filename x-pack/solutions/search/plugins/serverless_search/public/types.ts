/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { IndexManagementPluginStart } from '@kbn/index-management-plugin/public';
import type { DiscoverSetup } from '@kbn/discover-plugin/public';
import type {
  SearchIndicesPluginSetup,
  SearchIndicesPluginStart,
} from '@kbn/search-indices/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSearchPluginStart {}

export interface ServerlessSearchPluginSetupDependencies {
  cloud: CloudSetup;
  management: ManagementSetup;
  serverless: ServerlessPluginSetup;
  discover: DiscoverSetup;
  searchIndices: SearchIndicesPluginSetup;
}

export interface ServerlessSearchPluginStartDependencies {
  cloud: CloudStart;
  console: ConsolePluginStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  management: ManagementStart;
  security: SecurityPluginStart;
  serverless: ServerlessPluginStart;
  share: SharePluginStart;
  indexManagement?: IndexManagementPluginStart;
  searchIndices: SearchIndicesPluginStart;
}
