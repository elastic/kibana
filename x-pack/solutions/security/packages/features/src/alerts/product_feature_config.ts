/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureAlertsKey } from '../product_features_keys';
import type { AlertsProductFeaturesConfig } from './types';

export const alertsDefaultProductFeaturesConfig: AlertsProductFeaturesConfig = {
  [ProductFeatureAlertsKey.externalDetections]: {
    privileges: {
      all: {
        ui: ['external_detections'],
        api: [],
      },
      read: {
        ui: ['external_detections'],
        api: [],
      },
    },
  },
  [ProductFeatureAlertsKey.detections]: {
    privileges: {
      all: {
        ui: ['detections'],
        api: ['bulkGetUserProfiles'],
      },
      read: {
        ui: ['detections'],
        api: ['bulkGetUserProfiles'],
      },
    },
  },
};
