/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ProductFeatureKeys,
  TimelineProductFeaturesConfigMap,
} from '@kbn/security-solution-features';
import {
  createEnabledProductFeaturesConfigMap,
  timelineDefaultProductFeaturesConfig,
} from '@kbn/security-solution-features/config';
import { ProductFeatureTimelineKey } from '@kbn/security-solution-features/keys';

export const getTimelineProductFeaturesConfigurator =
  (enabledProductFeatureKeys: ProductFeatureKeys) => (): TimelineProductFeaturesConfigMap =>
    createEnabledProductFeaturesConfigMap(
      ProductFeatureTimelineKey,
      timelineDefaultProductFeaturesConfig,
      enabledProductFeatureKeys
    );
