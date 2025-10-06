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
    defaultMessage: 'Start dashboards migration',
  }
);

export const START_DASHBOARDS_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.startMigrationDialog.description',
  {
    defaultMessage:
      'You are about to start dashboards migration and this will incur additional tokens. You have option to choose a different LLM. This option applies only to the current execution.',
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
      'You are about to retry dashboards migration and this will incur additional tokens. You have option to choose a different LLM. This option applies only to the current execution.',
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
      'You are about to reprocess selected dashboards and this will incur additional tokens. You have option to choose a different LLM. This option applies only to the current execution.',
  }
);
