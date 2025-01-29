/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { withSuspenseUpsell } from '@kbn/security-solution-upselling/helpers';

export const EntityAnalyticsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() =>
    import('./sections/entity_analytics_upselling').then(
      ({ EntityAnalyticsUpsellingSectionESS }) => ({
        default: EntityAnalyticsUpsellingSectionESS,
      })
    )
  )
);

export const EntityAnalyticsUpsellingPageLazy = lazy(() =>
  import('./pages/entity_analytics_upselling').then(({ EntityAnalyticsUpsellingPageESS }) => ({
    default: EntityAnalyticsUpsellingPageESS,
  }))
);

export const AttackDiscoveryUpsellingPageLazy = lazy(() =>
  import('./pages/attack_discovery').then(({ AttackDiscoveryUpsellingPageESS }) => ({
    default: AttackDiscoveryUpsellingPageESS,
  }))
);
