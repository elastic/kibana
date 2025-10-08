/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALREADY_INSTALLED_DASHBOARD_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.table.alreadyInstalledTooltip',
  {
    defaultMessage: 'Already installed migration dashboard',
  }
);

export const NOT_TRANSLATED_DASHBOARD_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.table.notTranslatedTooltip',
  {
    defaultMessage: 'Not translated migration dashboard',
  }
);

export const REPROCESS_DASHBOARDS_DIALOG_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.siemMigrations.dashboards.table.reprocessDialog.title', {
    defaultMessage: 'Reprocess {count} {count, plural, one {dashboard} other {dashboards}}',
    values: { count },
  });

export const REPROCESS_DASHBOARDS_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.table.reprocessDialog.description',
  {
    defaultMessage:
      'You are about to reprocess selected dashboards and this will incur additional tokens. You have option to choose a different LLM. This option applies only to the current execution.',
  }
);
