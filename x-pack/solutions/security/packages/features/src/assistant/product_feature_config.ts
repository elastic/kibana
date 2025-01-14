/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantSubFeatureId, ProductFeatureAssistantKey } from '../product_features_keys';
import type { ProductFeatureKibanaConfig } from '../types';

/**
 * App features privileges configuration for the Security Assistant Kibana Feature app.
 * These are the configs that are shared between both offering types (ess and serverless).
 * They can be extended on each offering plugin to register privileges using different way on each offering type.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 */
export const assistantDefaultProductFeaturesConfig: Record<
  ProductFeatureAssistantKey,
  ProductFeatureKibanaConfig<AssistantSubFeatureId>
> = {
  [ProductFeatureAssistantKey.assistant]: {
    privileges: {
      all: {
        ui: ['ai-assistant'],
      },
    },
    subFeatureIds: [
      AssistantSubFeatureId.updateAnonymization,
      AssistantSubFeatureId.manageGlobalKnowledgeBase,
    ],
  },
};
