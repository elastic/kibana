/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ProductFeatureKeys,
  AssistantProductFeaturesConfigMap,
} from '@kbn/security-solution-features';
import {
  assistantDefaultProductFeaturesConfig,
  createEnabledProductFeaturesConfigMap,
} from '@kbn/security-solution-features/config';
import { ProductFeatureAssistantKey } from '@kbn/security-solution-features/keys';

export const getSecurityAssistantProductFeaturesConfigurator =
  (enabledProductFeatureKeys: ProductFeatureKeys) => (): AssistantProductFeaturesConfigMap => {
    return createEnabledProductFeaturesConfigMap(
      ProductFeatureAssistantKey,
      assistantDefaultProductFeaturesConfig,
      enabledProductFeatureKeys
    );
  };
