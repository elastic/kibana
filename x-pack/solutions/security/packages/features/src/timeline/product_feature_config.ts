/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureTimelineKey } from '../product_features_keys';
import type { ProductFeaturesConfig } from '../types';

export const timelineProductFeaturesConfig: ProductFeaturesConfig<ProductFeatureTimelineKey> = {
  [ProductFeatureTimelineKey.timeline]: {
    privileges: {
      all: {
        api: ['timeline_read', 'timeline_write'],
        ui: ['read', 'crud'],
      },
      read: {
        api: ['timeline_read'],
        ui: ['read'],
      },
    },
  },
};
