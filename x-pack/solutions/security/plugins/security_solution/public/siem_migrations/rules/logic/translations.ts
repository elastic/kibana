/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_MIGRATION_PREBUILT_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.getMigrationPrebuiltRulesFailDescription',
  {
    defaultMessage: 'Failed to fetch prebuilt rules',
  }
);

export const GET_MIGRATION_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.getMigrationRulesFailDescription',
  {
    defaultMessage: 'Failed to fetch migration rules',
  }
);

export const GET_MIGRATION_TRANSLATION_STATS_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.getMigrationTranslationStatsFailDescription',
  {
    defaultMessage: 'Failed to fetch migration translation stats',
  }
);

export const INSTALL_MIGRATION_RULES_SUCCESS = (succeeded: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.rules.installMigrationRulesSuccess', {
    defaultMessage: '{succeeded, plural, one {# rule} other {# rules}} installed successfully.',
    values: { succeeded },
  });

export const INSTALL_MIGRATION_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.installMigrationRulesFailDescription',
  {
    defaultMessage: 'Failed to install migration rules',
  }
);

export const UPDATE_MIGRATION_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.updateMigrationRulesFailDescription',
  {
    defaultMessage: 'Failed to update migration rules',
  }
);

export const RETRY_FAILED_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.retryFailedRulesFailDescription',
  {
    defaultMessage: 'Failed to reprocess migration rules',
  }
);

export const UPDATE_MIGRATION_NAME_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.updateMigrationNameSuccess',
  {
    defaultMessage: 'Migration name updated',
  }
);

export const UPDATE_MIGRATION_NAME_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.updateMigrationNameFailDescription',
  {
    defaultMessage: 'Failed to update migration name',
  }
);

export const DELETE_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.deleteMigrationSuccess',
  {
    defaultMessage: 'Migration deleted',
  }
);

export const DELETE_MIGRATION_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.deleteMigrationFailDescription',
  {
    defaultMessage: 'Failed to delete migration',
  }
);
