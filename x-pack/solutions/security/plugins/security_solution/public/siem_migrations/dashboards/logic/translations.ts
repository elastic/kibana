/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_MIGRATION_DASHBOARDS_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.getMigrationDashboardsFailDescription',
  {
    defaultMessage: 'Failed to fetch migration dashboards',
  }
);

export const GET_MIGRATION_TRANSLATION_STATS_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.getMigrationTranslationStatsFailDescription',
  {
    defaultMessage: 'Failed to fetch migration translation stats',
  }
);

export const INSTALL_MIGRATION_DASHBOARDS_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.installMigrationDashboardsFailDescription',
  {
    defaultMessage: 'Failed to install migration dashboards',
  }
);

export const INSTALL_MIGRATION_DASHBOARDS_SUCCESS = (succeeded: number) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.dashboards.installMigrationDashboardsSuccess',
    {
      defaultMessage:
        '{succeeded, plural, one {# dashboard} other {# dashboards}} installed successfully.',
      values: { succeeded },
    }
  );
