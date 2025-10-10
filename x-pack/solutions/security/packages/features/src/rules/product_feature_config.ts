/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureRulesKey } from '../product_features_keys';
import type { RulesProductFeaturesConfig } from './types';

export const rulesDefaultProductFeaturesConfig: RulesProductFeaturesConfig = {
  [ProductFeatureRulesKey.externalDetections]: {
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
  [ProductFeatureRulesKey.detections]: {
    privileges: {
      all: {
        ui: ['detections'],
        api: ['cloud-security-posture-all', 'cloud-security-posture-read', 'bulkGetUserProfiles'],
      },
      read: {
        ui: ['detections'],
        api: ['cloud-security-posture-read', 'bulkGetUserProfiles'],
      },
    },
  },
};
