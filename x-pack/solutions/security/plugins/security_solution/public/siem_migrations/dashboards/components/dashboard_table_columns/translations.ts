/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLUMN_NAME = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.nameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.statusLabel',
  {
    defaultMessage: 'Status',
  }
);

export const COLUMN_TAGS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.tagsLabel',
  {
    defaultMessage: 'Tags',
  }
);

export const COLUMN_UPDATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.updatedLabel',
  {
    defaultMessage: 'Updated',
  }
);

export const STATUS_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.statusTooltipTitle',
  {
    defaultMessage: 'Translation Status legend',
  }
);

export const INSTALLED_STATUS_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.installedStatusTitle',
  {
    defaultMessage: 'Installed',
  }
);

export const ACTIONS_VIEW_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.actionsViewLabel',
  {
    defaultMessage: 'View',
  }
);

export const ACTIONS_INSTALL_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.actionsInstallLabel',
  {
    defaultMessage: 'Install',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tableColumn.actionsLabel',
  {
    defaultMessage: 'Actions',
  }
);

export const VIEW_DASHBOARD_TRANSLATION_SUMMARY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.viewDashboardTranslationSummaryTooltip',
  {
    defaultMessage: 'View dashboard translation summary',
  }
);

export const UPDATE_COLUMN_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.updateColumnTooltip',
  {
    defaultMessage:
      'This column references the date in the dashboard when last modified in the source platform.',
  }
);

export const TAGS_COLUMN_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.tagsColumnTooltip',
  {
    defaultMessage: 'Tags reference the app the dashboard originated from.',
  }
);
