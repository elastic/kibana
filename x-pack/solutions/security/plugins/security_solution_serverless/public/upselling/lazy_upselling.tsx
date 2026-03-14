/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { lazy } from 'react';

import { withSuspenseUpsell } from '@kbn/security-solution-upselling/helpers';

export const ThreatIntelligencePaywallLazy = withSuspenseUpsell(
  lazy(() => import('./pages/threat_intelligence_paywall.js'))
);

export const OsqueryResponseActionsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() => import('./pages/osquery_automated_response_actions.js'))
);

export const EntityAnalyticsUpsellingPageLazy = withSuspenseUpsell(
  lazy(() =>
    import('@kbn/security-solution-upselling/pages/entity_analytics.js').then(
      (mod) =>
        ({
          default: (mod as Record<string, unknown>).EntityAnalyticsUpsellingPage,
        } as { default: React.ComponentType<{ upgradeToLabel: string; upgradeMessage: string }> })
    )
  )
);

export const EntityAnalyticsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() =>
    import('@kbn/security-solution-upselling/sections/entity_analytics.js').then(
      (mod) =>
        ({
          default: (mod as Record<string, unknown>).EntityAnalyticsUpsellingSection,
        } as {
          default: React.ComponentType<{ upgradeToLabel: string; upgradeMessage: string }>;
        })
    )
  )
);

export const SiemMigrationsStartUpsellSectionLazy = withSuspenseUpsell(
  lazy(() =>
    import('./sections/siem_migrations/siem_migrations_start.js').then(
      ({ SiemMigrationStartUpsellSection }) => ({ default: SiemMigrationStartUpsellSection })
    )
  )
);

export const SiemMigrationsTranslatedRulesUpsellPageLazy = withSuspenseUpsell(
  lazy(() =>
    import('./pages/siem_migrations_translated_rules.js').then(
      ({ SiemMigrationsTranslatedRulesUpsellPage }) => ({
        default: SiemMigrationsTranslatedRulesUpsellPage,
      })
    )
  )
);

export const AttackDiscoveryUpsellingPageLazy = withSuspenseUpsell(
  lazy(() =>
    import('./pages/attack_discovery/index.js').then(
      ({ AttackDiscoveryUpsellingPageServerless }) => ({
        default: AttackDiscoveryUpsellingPageServerless,
      })
    )
  )
);
