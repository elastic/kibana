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
    import('./sections/entity_analytics_upselling.js').then(
      ({ EntityAnalyticsUpsellingSectionESS }) => ({
        default: EntityAnalyticsUpsellingSectionESS,
      })
    )
  )
);

export const SiemMigrationsStartUpsellSectionLazy = withSuspenseUpsell(
  lazy(() =>
    import('./sections/siem_migration_start.js').then(({ SiemMigrationStartUpsellSection }) => ({
      default: SiemMigrationStartUpsellSection,
    }))
  )
);

export const SiemMigrationsTranslatedRulesUpsellPageLazy = withSuspenseUpsell(
  lazy(() =>
    import('./pages/siem_migrations_translated_rules.js').then(
      ({ SiemMigrationsTranslatedRulesPage }) => ({
        default: SiemMigrationsTranslatedRulesPage,
      })
    )
  )
);

export const EntityAnalyticsUpsellingPageLazy = lazy(() =>
  import('./pages/entity_analytics_upselling.js').then(({ EntityAnalyticsUpsellingPageESS }) => ({
    default: EntityAnalyticsUpsellingPageESS,
  }))
);

export const AttackDiscoveryUpsellingPageLazy = lazy(() =>
  import('./pages/attack_discovery/index.js').then(({ AttackDiscoveryUpsellingPageESS }) => ({
    default: AttackDiscoveryUpsellingPageESS,
  }))
);

export const AIValueUpsellingPageLazy = withSuspenseUpsell(
  lazy(() =>
    import('./pages/ai_value/index.js').then(({ AIValueUpsellingPageESS }) => ({
      default: AIValueUpsellingPageESS,
    }))
  )
);
