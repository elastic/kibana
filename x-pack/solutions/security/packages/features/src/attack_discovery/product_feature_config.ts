/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttackDiscoverySubFeatureId,
  ProductFeatureAttackDiscoveryKey,
} from '../product_features_keys';
import type { ProductFeaturesConfig } from '../types';

export const attackDiscoveryProductFeaturesConfig: ProductFeaturesConfig<
  ProductFeatureAttackDiscoveryKey,
  AttackDiscoverySubFeatureId
> = {
  [ProductFeatureAttackDiscoveryKey.attackDiscovery]: {
    privileges: {
      all: {
        ui: ['attack-discovery'],
      },
    },
    subFeatureIds: [AttackDiscoverySubFeatureId.updateSchedule],
  },
};
