/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OnboardingGroupConfig } from '../../onboarding/types';
import { aiConnectorCardConfig } from '../../onboarding/components/onboarding_body/cards/siem_migrations/ai_connector';
import { startRuleMigrationCardConfig } from '../../onboarding/components/onboarding_body/cards/siem_migrations/start_migration/rules';
import { startDashboardMigrationCardConfig } from '../../onboarding/components/onboarding_body/cards/siem_migrations/start_migration/dashboards';
import { siemMigrationIntegrationsCardConfig } from '../../onboarding/components/onboarding_body/cards/siem_migrations/integrations';

export const siemMigrationsBodyConfig: OnboardingGroupConfig[] = [
  {
    title: i18n.translate('xpack.securitySolution.siemMigrations.onboarding.configure.title', {
      defaultMessage: 'Configure',
    }),
    cards: [aiConnectorCardConfig],
  },
  {
    title: i18n.translate('xpack.securitySolution.siemMigrations.onboarding.migrate.title', {
      defaultMessage: 'Migrate rules & dashboards',
    }),
    cards: [
      startRuleMigrationCardConfig,
      siemMigrationIntegrationsCardConfig,
      startDashboardMigrationCardConfig,
    ],
  },
];
