/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type { ConsolePluginSetup, ConsolePluginStart } from '@kbn/console-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { MlPluginStart } from '@kbn/ml-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

export * from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginStart {}

export interface AppPluginStartDependencies {
  history: AppMountParameters['history'];
  share: SharePluginStart;
  console?: ConsolePluginStart;
  licensing: LicensingPluginStart;
  ml: MlPluginStart;
  searchNavigation?: SearchNavigationPluginStart;
  serverless?: ServerlessPluginStart;
  cloud?: CloudStart;
}

export interface AppPluginSetupDependencies {
  history: AppMountParameters['history'];
  share: SharePluginSetup;
  console?: ConsolePluginSetup;
}

export type AppServicesContext = CoreStart & AppPluginStartDependencies;

export interface InferenceUsageResponse {
  acknowledge: boolean;
  error_message: string;
  indexes: string[];
  pipelines: string[];
}

export enum GroupByOptions {
  None = 'none',
  Model = 'model_id',
}

export interface FilterOptions {
  provider: ServiceProviderKeys[];
  type: InferenceTaskType[];
}

export interface GroupedInferenceEndpointsData {
  groupId: string;
  groupLabel: string;
  endpoints: InferenceAPIConfigResponse[];
}
