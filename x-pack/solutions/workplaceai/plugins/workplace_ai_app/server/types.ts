/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { DataCatalogPluginSetup } from '@kbn/data-catalog-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkplaceAIAppPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkplaceAIAppPluginStart {}

export interface WorkplaceAIAppPluginSetupDependencies {
  features: FeaturesPluginSetup;
  dataCatalog: DataCatalogPluginSetup;
}

export interface WorkplaceAIAppPluginStartDependencies {
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
}
