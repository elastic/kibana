/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_DASHBOARDS_MIGRATION_DIALOG_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.startMigrationDialog.title',
  {
    defaultMessage: 'Migrate dashboards',
  }
);

export const START_DASHBOARDS_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.startMigrationDialog.description',
  {
    defaultMessage: 'You are about to start a migration. Select which AI connector to use.',
  }
);

export const RETRY_DASHBOARDS_MIGRATION_DIALOG_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.retryMigrationDialog.title',
  {
    defaultMessage: 'Retry dashboards migration',
  }
);

export const RETRY_DASHBOARDS_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.retryMigrationDialog.description',
  {
    defaultMessage:
      'You are about to retry a migration, which will use additional tokens. Select which AI connector to use.',
  }
);

export const REPROCESS_DASHBOARDS_MIGRATION_DIALOG_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.dashboards.reprocessDialog.title', {
    defaultMessage: 'Reprocess {count} {count, plural, one {dashboard} other {dashboards}}',
    values: { count },
  });

export const REPROCESS_DASHBOARDS_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.reprocessDialog.description',
  {
    defaultMessage:
      'You are about to reprocess a migration, which will use additional tokens. Select which AI connector to use.',
  }
);
