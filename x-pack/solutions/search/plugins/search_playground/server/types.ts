/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { Document } from '@langchain/core/documents';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';

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
  inference: InferenceServerStart;
  cloud?: CloudStart;
}

export * from '../common/types';

export type HitDocMapper = (hit: SearchHit) => Document;

export type ElasticsearchRetrieverContentField = string | Record<string, string | string[]>;

export interface DefineRoutesOptions {
  logger: Logger;
  router: IRouter;
  getStartServices: StartServicesAccessor<
    SearchPlaygroundPluginStartDependencies,
    SearchPlaygroundPluginStart
  >;
}
