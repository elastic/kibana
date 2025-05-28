/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_MIGRATION_INTEGRATIONS_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.migrationIntegrations.title',
  { defaultMessage: 'Add SIEM data with Integrations' }
);

export const MIGRATION_MISSING_TEXT = i18n.translate(
  'xpack.securitySolution.onboarding.migrationIntegrations.missingMigration.title',
  { defaultMessage: 'Complete a rule migration to get integration recommendations' }
);

export const MIGRATION_MISSING_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.migrationIntegrations.missingMigration.button',
  { defaultMessage: 'Start rule migration' }
);

export const DETECTED_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.migrationIntegrations.detectedTabLabel',
  { defaultMessage: 'Detected' }
);

export const TOTAL_RULES = (count: number) =>
  i18n.translate('xpack.securitySolution.onboarding.migrationIntegrations.totalRules', {
    values: { count },
    defaultMessage: '{count} rules',
  });
