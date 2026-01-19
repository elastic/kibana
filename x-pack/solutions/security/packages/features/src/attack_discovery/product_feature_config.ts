/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_API_ACTION_ALL } from '../actions';
import {
  AttackDiscoverySubFeatureId,
  ProductFeatureAttackDiscoveryKey,
} from '../product_features_keys';
import type { ProductFeaturesConfig } from '../types';

/**
 * The Security solution RBAC framework MERGES (combines) these with the base
 * config defined in
 * `x-pack/solutions/security/packages/features/src/attack_discovery/kibana_features.ts`
 * to produce the final feature definition for the Attack Discovery feature.
 */
export const attackDiscoveryProductFeaturesConfig: ProductFeaturesConfig<
  ProductFeatureAttackDiscoveryKey,
  AttackDiscoverySubFeatureId
> = {
  [ProductFeatureAttackDiscoveryKey.attackDiscovery]: {
    privileges: {
      all: {
        api: [ATTACK_DISCOVERY_API_ACTION_ALL], // required in public API routes authz
        ui: ['attack-discovery'],
      },
    },
    subFeatureIds: [AttackDiscoverySubFeatureId.updateSchedule],
  },
};
